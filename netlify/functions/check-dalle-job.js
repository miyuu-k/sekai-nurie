// netlify/functions/check-dalle-job.js
// シンプル版ジョブ確認

exports.handler = async (event, context) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
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
  
      // グローバルオブジェクトから結果を取得
      const jobResult = global.jobResults?.get(jobId);
  
      if (!jobResult) {
        console.log('Job not found:', jobId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'processing',
            progress: 25,
            message: 'Processing...',
            jobId: jobId
          }),
        };
      }
  
      console.log('Job result found:', jobResult.status);
  
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
          statusCode: 200, // エラーでも200を返す（フロントエンドで処理）
          headers,
          body: JSON.stringify({
            status: 'failed',
            error: jobResult.error || 'Processing failed',
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