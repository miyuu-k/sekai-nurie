// netlify/functions/check-coloring-job.js
// ステップ2: ジョブの進行状況を確認
const fetch = require('node-fetch');

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
    // URLパラメータからジョブIDを取得
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job ID is required' }),
      };
    }

    console.log('Checking job status:', jobId);

    // Replicate APIでジョブ状況を確認
    const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to check job status:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to check job status',
          details: result.detail || 'Unknown error'
        }),
      };
    }

    console.log('Job status:', result.status);

    // ステータスに応じてレスポンス
    if (result.status === 'succeeded') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'completed',
          imageUrl: result.output[0],
          jobId: jobId
        }),
      };
    } else if (result.status === 'failed') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          status: 'failed',
          error: result.error || 'Image processing failed',
          jobId: jobId
        }),
      };
    } else {
      // まだ処理中
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: result.status, // 'starting' or 'processing'
          progress: result.status === 'processing' ? 50 : 25,
          jobId: jobId
        }),
      };
    }

  } catch (error) {
    console.error('Function Error:', error);
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