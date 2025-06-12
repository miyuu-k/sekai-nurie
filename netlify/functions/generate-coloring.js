// netlify/functions/generate-coloring.js
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  // CORSヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // プリフライトリクエスト対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // リクエストボディから画像データを取得
    const { imageData } = JSON.parse(event.body);
    
    if (!imageData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data is required' }),
      };
    }

    // Base64データをBufferに変換
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // FormDataを作成
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'upload.png',
      contentType: 'image/png',
    });
    
    // DALL-E 2用のプロンプト
    const prompt = 'Convert this image into a simple line drawing for children\'s coloring book. Use thick black lines, simple shapes, cute and child-friendly style, black and white only, no shading or colors. Make it suitable for children up to 6 years old.';
    
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '512x512');
    formData.append('response_format', 'url');

    // OpenAI APIに画像編集リクエストを送信
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OpenAI API Error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to generate coloring page',
          details: result.error?.message || 'Unknown error'
        }),
      };
    }

    // 成功時のレスポンス
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl: result.data[0].url,
      }),
    };

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