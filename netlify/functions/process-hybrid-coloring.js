// netlify/functions/process-hybrid-coloring.js
// Replicate で前処理 → OpenAI DALL-E 3 で最終仕上げ

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== HYBRID REPLICATE + DALL-E 3 ===');
  
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

    console.log('Starting hybrid processing...');

    // STEP 1: Replicateで粗い線画を作成（高速）
    console.log('Step 1: Replicate rough line art...');
    
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured');
    }

    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613", // ControlNet Canny
        input: {
          image: imageData,
          prompt: "simple black and white line drawing, basic outlines, coloring book style",
          negative_prompt: "detailed, complex, colors",
          num_inference_steps: 15, // 高速化のため少なめ
          guidance_scale: 7.0,
          controlnet_conditioning_scale: 1.0
        }
      }),
    });

    if (!replicateResponse.ok) {
      throw new Error(`Replicate failed: ${replicateResponse.status}`);
    }

    const replicatePrediction = await replicateResponse.json();
    
    // ポーリングで結果取得
    let replicateResult = replicatePrediction;
    let attempts = 0;
    const maxAttempts = 15;

    while (replicateResult.status !== 'succeeded' && replicateResult.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${replicatePrediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      replicateResult = await pollResponse.json();
      attempts++;
      console.log(`Replicate poll ${attempts}: ${replicateResult.status}`);
    }

    if (replicateResult.status !== 'succeeded' || !replicateResult.output) {
      throw new Error('Replicate processing failed');
    }

    const roughLineArt = Array.isArray(replicateResult.output) ? replicateResult.output[0] : replicateResult.output;
    console.log('Rough line art created:', roughLineArt);

    // STEP 2: DALL-E 3 で可愛くリファイン
    console.log('Step 2: DALL-E 3 kawaii refinement...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // 粗い線画をDASLL-E 3に送って可愛く仕上げる
    const dalle3Response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Create an extremely cute kawaii-style coloring book page for children ages 3-6, inspired by this reference. Style requirements:
        - Ultra-thick black outlines (5-6px thick) perfect for small hands
        - Pure white background with no textures
        - SUPER kawaii chibi style: enormous round eyes (eyes should be 1/3 of the head), tiny dot nose, small smiling mouth
        - Head should be 2-3 times larger than the body (classic chibi proportions)
        - All shapes should be puffy and rounded like soft pillows or marshmallows
        - Remove ALL internal details, patterns, and small elements
        - Make everything simplified into basic geometric shapes (circles, ovals, rounded rectangles)
        - Japanese kawaii aesthetic with maximum cuteness factor
        - Think Hello Kitty, Pikachu, or Pusheen level of simplification
        - Perfect for ages 3-6 to color with chunky crayons
        - ONLY black outlines on pure white background - no colors, no shading, no gradients
        Reference style guide: ${roughLineArt}`,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural"
      }),
    });

    if (!dalle3Response.ok) {
      const errorText = await dalle3Response.text();
      throw new Error(`DALL-E 3 failed: ${dalle3Response.status} - ${errorText}`);
    }

    const dalle3Result = await dalle3Response.json();
    
    if (dalle3Result.data && dalle3Result.data.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: dalle3Result.data[0].url,
          model: 'Hybrid-Replicate-DALLE3',
          method: 'Replicate rough processing → DALL-E 3 kawaii refinement',
          roughLineArt: roughLineArt // デバッグ用
        })
      };
    } else {
      throw new Error('DALL-E 3 generation failed');
    }

  } catch (error) {
    console.error('Hybrid processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: `Hybrid processing error: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
    };
  }
};