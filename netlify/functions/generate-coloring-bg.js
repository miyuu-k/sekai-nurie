// netlify/functions/generate-coloring-bg.js
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  // Background Functionとして実行
  context.callbackWaitsForEmptyEventLoop = false;

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
    const { imageData, jobId } = JSON.parse(event.body);
    
    if (!imageData || !jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data and job ID are required' }),
      };
    }

    // すぐにjobIdを返す（Background処理開始の確認）
    setTimeout(async () => {
      try {
        // 実際のDALL-E処理
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('image', imageBuffer, {
          filename: 'upload.png',
          contentType: 'image/png',
        });
        
        const prompt = 'Convert this image into a simple line drawing for children\'s coloring book. Use thick black lines, simple shapes, cute and child-friendly style, black and white only, no shading or colors. Make it suitable for children up to 6 years old.';
        
        formData.append('prompt', prompt);
        formData.append('n', '1');
        formData.append('size', '512x512');
        formData.append('response_format', 'url');

        const response = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders(),
          },
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          // 結果をWebhookまたはDatabase（例：Netlify Forms）に保存
          // ここでは簡単な方法として、結果をログに出力
          console.log(`Job ${jobId} completed:`, result.data[0].url);
          
          // 実際の実装では、結果をどこかに保存し、
          // フロントエンドがポーリングで確認できるようにする
        } else {
          console.error(`Job ${jobId} failed:`, result);
        }
      } catch (error) {
        console.error(`Job ${jobId} error:`, error);
      }
    }, 0);

    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId,
        status: 'processing',
        message: 'Job started successfully'
      }),
    };

  } catch (error) {
    console.error('Background Function Error:', error);
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