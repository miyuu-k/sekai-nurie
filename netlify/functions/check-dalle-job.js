// netlify/functions/check-dalle-job.js
// エラーハンドリング強化版

exports.handler = async (event, context) => {
    console.log('=== CHECK JOB START ===');
    console.log('Method:', event.httpMethod);
    console.log('Query params:', event.queryStringParameters);
    
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json'
    };
  
    if (event.httpMethod === 'OPTIONS') {
      console.log('OPTIONS request');
      return { statusCode: 200, headers, body: '' };
    }
  
    try {
      const jobId = event.queryStringParameters?.jobId;
      
      if (!jobId) {
        console.log('No job ID provided');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Job ID is required',
            status: 'error'
          }),
        };
      }
  
      console.log('Checking job status for:', jobId);
      console.log('Global jobResults exists:', !!global.jobResults);
      console.log('Global jobResults size:', global.jobResults?.size || 0);
  
      // デバッグ: 全てのジョブIDを表示
      if (global.jobResults) {
        console.log('Available job IDs:', Array.from(global.jobResults.keys()));
      }
  
      // グローバルオブジェクトから結果を取得
      const jobResult = global.jobResults?.get(jobId);
      console.log('Job result found:', !!jobResult);
      console.log('Job result:', jobResult);
  
      if (!jobResult) {
        console.log('Job not found, returning processing status');
        const response = {
          status: 'processing',
          progress: 50,
          message: 'Still processing...',
          jobId: jobId,
          debug: 'Job not found in global storage'
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(response),
        };
      }
  
      console.log('Returning job result:', jobResult.status);
  
      if (jobResult.status === 'completed') {
        const response = {
          status: 'completed',
          imageUrl: jobResult.imageUrl,
          detectedObject: jobResult.detectedObject,
          model: jobResult.model,
          jobId: jobId
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(response),
        };
      } else if (jobResult.status === 'failed') {
        const response = {
          status: 'failed',
          error: jobResult.error || 'Processing failed',
          jobId: jobId
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(response),
        };
      } else {
        // まだ処理中
        const response = {
          status: jobResult.status || 'processing',
          progress: jobResult.progress || 50,
          message: jobResult.message || 'Processing...',
          jobId: jobId
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(response),
        };
      }
  
    } catch (error) {
      console.error('=== CHECK JOB ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      const errorResponse = {
        error: 'Internal server error',
        details: error.message,
        status: 'error'
      };
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(errorResponse),
      };
    }
  };