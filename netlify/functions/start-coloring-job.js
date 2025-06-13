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

    // より具体的で元画像を重視するプロンプト
    const prompt = "convert this image to clean black and white line art coloring book page, preserve the main subject and shapes from the original image, thick black outlines, simple clean lines, suitable for children coloring, maintain the composition and key features";
    const negativePrompt = "nsfw, adult content, inappropriate, sexual, violence, scary, realistic shading, complex details, photographic, blurry, noisy, colors, filled areas";

    // より元画像に忠実なControlNetモデル（Canny Edge Detection特化）
    const modelVersions = [
      // 1. ControlNet Canny (エッジ検出で輪郭を正確に保持)
      "aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613",
      // 2. より強力なControlNet
      "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      // 3. 安定版ControlNet
      "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56472a247b"
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
              num_inference_steps: 20, // 品質向上のため少し増加
              guidance_scale: 7.0, // 元画像との関連性を高める
              controlnet_conditioning_scale: 1.2, // 元画像の影響を強化
              scheduler: "DPMSolverMultistep",
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