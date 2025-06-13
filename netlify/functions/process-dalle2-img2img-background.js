// netlify/functions/process-dalle2-img2img-background.js
// DALL-E 2 img-to-img Background Function
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  console.log('=== DALL-E 2 IMG-TO-IMG PROCESSING ===');
  
  // Background Function として実行
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    console.log('Starting DALL-E 2 img-to-img processing...');
    console.log('Image data length:', imageData.length);

    // OpenAI API Key確認
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Base64データをBufferに変換
    console.log('Converting base64 to buffer...');
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log('Image buffer size:', imageBuffer.length);

    // 子ども向けぬりえ専用プロンプト
    const prompt = `Transform this image into a simple black and white line drawing coloring book page for children ages 3-6. Style: thick black outlines only, white background, no colors, no shading, no filled areas. Design: kawaii chibi style with big round eyes, simplified cute shapes. Remove all colors and details, keep only essential outlines. Make it perfect for children to color with crayons.`;

    console.log('Creating FormData for DALL-E 2...');
    
    // FormDataを作成
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'upload.png',
      contentType: 'image/png',
    });
    
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('response_format', 'url');

    console.log('Calling DALL-E 2 image edit API...');

    // DALL-E 2の画像編集APIを呼び出し
    const dalleResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log('DALL-E 2 response status:', dalleResponse.status);
    console.log('DALL-E 2 response ok:', dalleResponse.ok);

    const dalleResult = await dalleResponse.json();
    console.log('DALL-E 2 result keys:', Object.keys(dalleResult));

    if (dalleResponse.ok && dalleResult.data && dalleResult.data.length > 0) {
      console.log('DALL-E 2 img-to-img successful');
      console.log('Generated image URL:', dalleResult.data[0].url);
      
      const responseData = {
        success: true,
        imageUrl: dalleResult.data[0].url,
        model: 'DALL-E-2-img2img',
        method: 'Image-to-Image conversion'
      };
      
      const responseBody = JSON.stringify(responseData);
      console.log('Response body length:', responseBody.length);
      console.log('Response body preview:', responseBody.substring(0, 100));
      
      const finalResponse = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
          'Content-Length': responseBody.length.toString()
        },
        body: responseBody
      };
      
      console.log('Final response headers:', finalResponse.headers);
      console.log('Sending successful response...');
      
      return finalResponse;
    } else {
      console.error('DALL-E 2 generation failed:', dalleResult);
      
      const errorData = {
        success: false,
        error: dalleResult.error?.message || 'DALL-E 2 image editing failed'
      };
      
      const errorBody = JSON.stringify(errorData);
      console.log('Error response body:', errorBody);
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json'
        },
        body: errorBody
      };
    }

  } catch (error) {
    console.error('=== DALL-E 2 FUNCTION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const errorData = {
      success: false,
      error: 'Internal server error',
      details: error.message
    };
    
    const errorBody = JSON.stringify(errorData);
    console.log('Catch error response body:', errorBody);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: errorBody,
    };
  }
};