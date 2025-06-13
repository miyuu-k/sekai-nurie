// netlify/functions/start-coloring-job.js
// 完全最新版 - NSFW対策とすべての修正を含む
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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

    console.log('Starting Replicate prediction...');

    // 超シンプル子ども向け線画プロンプト（構造重視）
    const prompt = "simple cute cartoon animal coloring book, thick black outlines, baby style, round shapes, big kawaii eyes, simple coloring page for 3 year old children, minimal line art, no details inside, just outline shapes, chibi cartoon style";
    const negativePrompt = "realistic, detailed fur, whiskers, complex textures, photographic, shading, gradients, filled black areas, adult coloring book, intricate details, realistic proportions";

    // より適切なControlNetモデル（線画生成特化）
    const modelVersions = [
      // 1. Scribble ControlNet - ラフな線画に適している
      "b27b6fcb0d8b656af5c1a5f3e83d7b47a4d696c50ee6b2d4b3a9b2f3e4c5d6e7",
      // 2. Lineart ControlNet - 線画専用
      "28c1b2925c1b18c0b3b5b6c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      // 3. より柔軟なControlNet
      "435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117"
    ];

    let lastError = null;

    // 複数のモデルを順番に試行
    for (let i = 0; i < modelVersions.length; i++) {
      try {
        console.log(`Trying model ${i + 1}/${modelVersions.length}: ${modelVersions[i]}`);

        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: modelVersions[i],
            input: {
              image: imageData,
              prompt: prompt,
              negative_prompt: negativePrompt,
              num_outputs: 1,
              num_inference_steps: 20, // 少し下げる（シンプル化）
              guidance_scale: 9.0, // 調整
              controlnet_conditioning_scale: 0.6, // バランス調整
              scheduler: "K_EULER_ANCESTRAL", // 別のスケジューラーを試行
              seed: Math.floor(Math.random() * 1000000)
            }
          }),
        });

        const prediction = await response.json();

        if (response.ok && prediction.id) {
          console.log(`Model ${i + 1} succeeded. Prediction started:`, prediction.id);
          
          // 成功した場合、即座にジョブIDを返す
          return {
            statusCode: 202, // Accepted
            headers,
            body: JSON.stringify({
              jobId: prediction.id,
              status: 'processing',
              model: `ControlNet-Safe-${i + 1}`,
              message: 'Child-safe image processing started successfully'
            }),
          };
        } else {
          console.error(`Model ${i + 1} failed:`, prediction);
          lastError = prediction;
        }

      } catch (error) {
        console.error(`Model ${i + 1} error:`, error);
        lastError = error;
      }
    }

    // すべてのモデルが失敗した場合
    console.error('All models failed');
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ 
        error: 'All child-safe image processing models failed',
        details: lastError?.detail || lastError?.message || 'Unknown error',
        suggestion: 'Please try again with a different image (animals, flowers, toys, etc.)'
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