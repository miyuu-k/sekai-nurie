// netlify/functions/start-dalle-job.js
// ジョブを開始して即座にIDを返す

exports.handler = async (event, context) => {
  console.log('=== START DALLE JOB ===');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { imageData } = JSON.parse(event.body);
    
    if (!imageData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data is required' }),
      };
    }

    console.log('Image data received, length:', imageData.length);

    // 簡単なジョブIDを生成
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated job ID:', jobId);

    // 実際の処理を開始（Background処理として）
    // Netlify Background Functionを呼び出し
    setTimeout(async () => {
      try {
        console.log('Starting background processing for:', jobId);
        
        // Background Function呼び出し
        await fetch(`${process.env.URL}/.netlify/functions/process-dalle-background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: jobId,
            imageData: imageData
          })
        });
        
      } catch (bgError) {
        console.error('Background job start error:', bgError);
      }
    }, 100); // 100ms後に開始

    // 即座にジョブIDを返す
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId: jobId,
        status: 'processing',
        message: 'Image processing started'
      }),
    };

  } catch (error) {
    console.error('Start job error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to start job',
        details: error.message
      }),
    };
  }
};