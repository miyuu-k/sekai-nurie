// netlify/functions/process-dalle-unified-background.js
// Background Function（15分タイムアウト）
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== BACKGROUND DALLE PROCESSING ===');
  
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

    console.log('Starting background processing...');
    
    // OpenAI API Key確認
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Step 1: 簡単な物体検出
    let detectedObject = "cute animal";
    
    try {
      console.log('Starting GPT-4o analysis...');

      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "この画像に写っている動物や物を1つの英単語で答えてください。例: cat, dog, rabbit, flower"
                },
                {
                  type: "image_url",
                  image_url: { url: imageData }
                }
              ]
            }
          ],
          max_tokens: 10
        }),
      });

      if (visionResponse.ok) {
        const visionResult = await visionResponse.json();
        detectedObject = visionResult.choices[0].message.content.trim().toLowerCase();
        console.log('Detected:', detectedObject);
      } else {
        console.log('Vision API failed, using default');
      }
    } catch (visionError) {
      console.log('Vision analysis failed:', visionError.message);
    }

    // Step 2: DALL-E 3で線画生成
    console.log('Starting DALL-E 3 generation...');

    const dallePrompt = `Simple black and white line drawing coloring book page of a cute ${detectedObject}. Style: thick black outlines ONLY, white background, no colors, no shading, no filled areas. Design: kawaii chibi style, big round eyes, simplified cute features. Format: clean line art suitable for children ages 3-6 to color with crayons. NO COLORS - only black lines on white background.`;

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: dallePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
        response_format: "url"
      }),
    });

    const dalleResult = await dalleResponse.json();

    if (dalleResponse.ok) {
      console.log('DALL-E generation successful');
      
      const responseData = {
        success: true,
        imageUrl: dalleResult.data[0].url,
        detectedObject: detectedObject,
        model: 'DALL-E-3-Background'
      };
      
      console.log('Returning success response:', responseData);
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
      };
    } else {
      console.error('DALL-E generation failed:', dalleResult);
      
      const errorData = {
        success: false,
        error: dalleResult.error?.message || 'Image generation failed'
      };
      
      console.log('Returning error response:', errorData);
      
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      };
    }

  } catch (error) {
    console.error('=== BACKGROUND FUNCTION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const errorData = {
      success: false,
      error: 'Internal server error',
      details: error.message
    };
    
    console.log('Returning catch error response:', errorData);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData),
    };
  }
};