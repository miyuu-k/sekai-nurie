// netlify/functions/generate-coloring.js
const fetch = require('node-fetch');

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

    console.log('Processing image data...');

    // DALL-E 3を使用した画像生成アプローチ
    // 元画像の説明を元に線画を生成
    const prompt = `Create a simple black and white line drawing coloring page for children aged 3-6 years old. The drawing should have:
- Thick, bold black lines (3-4px width)
- Simple, cute shapes that are easy to color
- No shading, gradients, or filled areas - only outlines
- Large areas suitable for coloring with crayons
- Child-friendly and fun design
- White background
- Clear, well-defined boundaries between different sections
Make it look like a professional children's coloring book page.`;

    // DALL-E 3 APIに画像生成リクエストを送信
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url"
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OpenAI API Error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to generate coloring page',
          details: result.error?.message || 'Unknown error',
          fullError: result
        }),
      };
    }

    console.log('Image generated successfully');

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