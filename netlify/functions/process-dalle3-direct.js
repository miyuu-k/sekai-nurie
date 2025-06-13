// netlify/functions/process-dalle3-direct.js
// DALL-E 3で直接可愛い線画生成（10秒以内）

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== DALL-E 3 DIRECT KAWAII GENERATION ===');
  
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

    console.log('Starting DALL-E 3 direct kawaii generation...');

    // OpenAI API Key確認
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // 画像解析用のプロンプト（GPT-4V で画像の内容を理解）
    console.log('Analyzing image with GPT-4V...');
    
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // GPT-4 with vision
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "この画像の主な被写体を簡潔に教えてください。動物、人物、物体、食べ物など、1-2語で答えてください。"
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
        max_tokens: 50
      }),
    });

    let subject = "cute character";
    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      if (analysisResult.choices && analysisResult.choices[0]) {
        subject = analysisResult.choices[0].message.content.trim();
        console.log('Detected subject:', subject);
      }
    } else {
      console.log('Image analysis failed, using default subject');
    }

    // 被写体に基づいて最適化されたプロンプトを生成
    const kawaiPrompt = `Create an extremely cute kawaii-style coloring book page featuring "${subject}" for children ages 3-6. 

ESSENTIAL STYLE REQUIREMENTS:
🎨 Ultra-thick black outlines (6-7px thick) perfect for small hands and chunky crayons
⚪ Pure white background with absolutely no textures, patterns, or shading
👁️ SUPER kawaii chibi style with ENORMOUS round eyes (eyes = 1/3 of head size)
😊 Tiny dot nose and small curved smile
📏 Extreme chibi proportions: head 3x larger than body
🟡 All shapes puffy and rounded like soft marshmallows or pillows
🚫 Remove ALL internal details, patterns, textures, and small elements
🔴 Simplify everything to basic geometric shapes (circles, ovals, rounded rectangles)
✨ Maximum Japanese kawaii cuteness (Hello Kitty / Pikachu / Pusheen level)
🖍️ Perfect for ages 3-6 with thick crayons or markers
⚫ ONLY black outlines on pure white background - NO colors, shading, or gradients

Think: if a 3-year-old drew this with the cutest possible style, what would it look like?`;

    console.log('Generating kawaii coloring page with DALL-E 3...');

    // DALL-E 3で直接生成
    const dalle3Response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: kawaiPrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural" // naturalの方が線画に適している
      }),
    });

    console.log('DALL-E 3 response status:', dalle3Response.status);

    if (!dalle3Response.ok) {
      const errorText = await dalle3Response.text();
      console.error('DALL-E 3 error:', errorText);
      throw new Error(`DALL-E 3 failed: ${dalle3Response.status} - ${errorText}`);
    }

    const dalle3Result = await dalle3Response.json();
    console.log('DALL-E 3 result keys:', Object.keys(dalle3Result));

    if (dalle3Result.data && dalle3Result.data.length > 0) {
      console.log('DALL-E 3 kawaii generation successful!');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: dalle3Result.data[0].url,
          model: 'DALL-E-3-Kawaii-Direct',
          method: 'Direct kawaii generation with subject analysis',
          detectedSubject: subject
        })
      };
    } else {
      throw new Error('DALL-E 3 generation returned no results');
    }

  } catch (error) {
    console.error('=== DALL-E 3 DIRECT ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: `DALL-E 3 direct error: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
    };
  }
};