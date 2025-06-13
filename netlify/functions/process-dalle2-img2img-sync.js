// netlify/functions/process-dalle2-img2img-sync.js
// DALL-E 2 img-to-img 同期版（10秒制限内で試行）
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  console.log('=== DALL-E 2 IMG-TO-IMG SYNC ===');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    console.log('Starting quick DALL-E 2 processing...');

    // Base64データをBufferに変換
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // シンプルなプロンプト（処理時間短縮）
    const prompt = `Convert to simple black and white line drawing for children. Thick outlines only, no colors.`;

    // FormDataを作成
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'upload.png',
      contentType: 'image/png',
    });
    
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '512x512'); // 小さめサイズで高速化
    formData.append('response_format', 'url');

    console.log('Calling DALL-E 2 API (quick mode)...');

    // DALL-E 2 API呼び出し
    const dalleResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const dalleResult = await dalleResponse.json();

    if (dalleResponse.ok && dalleResult.data && dalleResult.data.length > 0) {
      console.log('Quick DALL-E 2 successful');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: dalleResult.data[0].url,
          model: 'DALL-E-2-Quick'
        })
      };
    } else {
      console.error('Quick DALL-E 2 failed:', dalleResult);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Quick processing failed, try again'
        })
      };
    }

  } catch (error) {
    console.error('Quick processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message
      }),
    };
  }
};