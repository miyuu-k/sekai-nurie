// netlify/functions/check-dalle-job.js
// ジョブの進行状況を確認

exports.handler = async (event, context) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
  
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  
    try {
      const jobId = event.queryStringParameters?.jobId;
      
      if (!jobId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Job ID is required' }),
        };
      }
  
      console.log('Checking job status:', jobId);
  
      // グローバル関数を使ってジョブ結果を取得
      let jobResult;
      if (global.getJobResult) {
        jobResult = global.getJobResult(jobId);
      } else {
        // フォールバック: まだ処理中とする
        jobResult = { status: 'processing', progress: 50 };
      }
  
      console.log('Job result:', jobResult);
  
      if (jobResult.status === 'completed') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'completed',
            imageUrl: jobResult.imageUrl,
            detectedObject: jobResult.detectedObject,
            model: jobResult.model,
            jobId: jobId
          }),
        };
      } else if (jobResult.status === 'failed') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            status: 'failed',
            error: jobResult.error || 'Processing failed',
            jobId: jobId
          }),
        };
      } else if (jobResult.status === 'not_found') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            status: 'not_found',
            error: 'Job not found',
            jobId: jobId
          }),
        };
      } else {
        // まだ処理中
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: jobResult.status,
            progress: jobResult.progress || 50,
            message: jobResult.message || 'Processing...',
            jobId: jobId
          }),
        };
      }
  
    } catch (error) {
      console.error('Check job error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: error.message
        }),
      };
    }
  };