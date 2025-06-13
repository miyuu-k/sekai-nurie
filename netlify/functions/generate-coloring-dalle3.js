// netlify/functions/generate-coloring-dalle3.js
// DALL-E 3 + GPT-4o Vision ハイブリッドアプローチ
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== DALL-E 3 FUNCTION START ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', event.headers);
  console.log('Body length:', event.body ? event.body.length : 0);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('CORS OPTIONS request');
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
    console.log('Starting DALL-E 3 hybrid approach...');

    // OpenAI API Key確認
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' }),
      };
    }

    console.log('OpenAI API key found');

    // Step 1: GPT-4o Visionで画像を詳細分析
    let animalType = "cute animal";
    let features = "cute and friendly";

    try {
      console.log('Starting image analysis with GPT-4o...');
      
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
                  text: "この画像を見て、子ども向けぬりえ線画を作るための詳細な説明を作成してください。以下の形式で答えてください：\n\n動物名: (例: cat, dog, rabbit)\n特徴: (色、模様、表情、ポーズなどの特徴を簡潔に)\n\n例：\n動物名: cat\n特徴: orange tabby cat sitting, looking up, cute expression, fluffy fur"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageData
                  }
                }
              ]
            }
          ],
          max_tokens: 100
        }),
      });

      if (visionResponse.ok) {
        const visionResult = await visionResponse.json();
        const analysis = visionResult.choices[0].message.content;
        console.log('Image analysis result:', analysis);
        
        // 分析結果から動物名と特徴を抽出
        const animalMatch = analysis.match(/動物名:\s*(\w+)/);
        const featuresMatch = analysis.match(/特徴:\s*(.+)/);
        
        if (animalMatch) animalType = animalMatch[1];
        if (featuresMatch) features = featuresMatch[1];
        
        console.log(`Detected: ${animalType}, Features: ${features}`);
      } else {
        console.log('Vision analysis failed, using defaults');
      }
    } catch (visionError) {
      console.log('Vision API error, using defaults:', visionError.message);
    }

    // Step 2: DALL-E 3で超厳格な線画生成
    const dallePrompt = `Simple black and white line drawing coloring book page of a cute ${animalType}. Style: thick black outlines ONLY, white background, no colors, no shading, no filled areas. Design: kawaii chibi style, big round eyes, simplified cute features based on "${features}". Format: clean line art suitable for children ages 3-6 to color with crayons. NO COLORS - only black lines on white background.`;

    console.log('Generating with DALL-E 3...');
    console.log('Prompt:', dallePrompt);

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
        style: "natural", // vivid だと色が付きやすいのでnatural
        response_format: "url"
      }),
    });

    const dalleResult = await dalleResponse.json();

    if (!dalleResponse.ok) {
      console.error('DALL-E 3 Error:', dalleResult);
      
      // フォールバック: より簡単なプロンプト
      console.log('Trying fallback prompt...');
      return await generateSimpleFallback(animalType, headers);
    }

    console.log('DALL-E 3 generation completed successfully');

    // 即座に結果を返す（DALL-E 3は待機不要）
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl: dalleResult.data[0].url,
        detectedObject: animalType,
        features: features,
        model: 'DALL-E-3-LineArt'
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

// フォールバック関数
async function generateSimpleFallback(animalType, headers) {
  try {
    const simpleDallePrompt = `Coloring book page: simple ${animalType} outline drawing. Black lines only on white background. Thick outlines. Cartoon style. No colors, no shading.`;

    console.log('Fallback prompt:', simpleDallePrompt);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: simpleDallePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
        response_format: "url"
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Fallback generation successful');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: result.data[0].url,
          detectedObject: animalType,
          model: 'DALL-E-3-Simple'
        }),
      };
    }

    throw new Error('Fallback also failed');

  } catch (error) {
    console.error('Fallback error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'All generation methods failed',
        details: error.message
      }),
    };
  }
}