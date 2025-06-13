// netlify/functions/process-dalle2-img2img-sync.js
// 改良版：より良いプロンプト + エラーハンドリング強化

const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  console.log('=== IMPROVED DALL-E 2 SYNC ===');
  
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
        body: JSON.stringify({ 
          success: false,
          error: 'Image data is required' 
        }),
      };
    }

    console.log('Starting improved sync processing...');

    // OpenAI API Key確認
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Base64データをBufferに変換
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('Image buffer size:', imageBuffer.length);

    // 改良版プロンプト：添付画像のような可愛い線画を目指す
    const prompt = `Transform into kawaii cute coloring book line art for children ages 3-6. Requirements: thick black outlines only (3-4px), pure white background, no colors/shading/gradients, big round kawaii eyes, chibi proportions (big head, small body), smooth flowing curves, remove all internal details, simple geometric shapes, connected lines perfect for coloring with crayons. Style: Japanese kawaii illustration, very simple and cute.`;

    // FormDataを作成
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'upload.png',
      contentType: 'image/png',
    });
    
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024'); // 高解像度に変更
    formData.append('response_format', 'url');

    console.log('Calling improved DALL-E 2 API...');

    // DALL-E 2 API呼び出し
    const dalleResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log('DALL-E 2 response status:', dalleResponse.status);
    console.log('DALL-E 2 response headers:', dalleResponse.headers.raw());

    let dalleResult;
    const responseText = await dalleResponse.text();
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response preview:', responseText.substring(0, 200));

    try {
      dalleResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Full response text:', responseText);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
    }

    if (dalleResponse.ok && dalleResult.data && dalleResult.data.length > 0) {
      console.log('Improved DALL-E 2 successful');
      console.log('Generated image URL:', dalleResult.data[0].url);
      
      const successResponse = {
        success: true,
        imageUrl: dalleResult.data[0].url,
        model: 'DALL-E-2-Enhanced',
        method: 'Improved img2img conversion'
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(successResponse)
      };
    } else {
      console.error('DALL-E 2 API error:', dalleResult);
      
      // OpenAI APIのエラーレスポンスを詳細にログ
      const errorMessage = dalleResult.error ? 
        `${dalleResult.error.message} (${dalleResult.error.type})` : 
        'Unknown API error';
      
      return {
        statusCode: dalleResponse.status || 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: `DALL-E 2 API error: ${errorMessage}`,
          details: dalleResult
        })
      };
    }

  } catch (error) {
    console.error('=== SYNC FUNCTION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: `Server error: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
    };
  }
};