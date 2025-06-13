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

    // 子ども向けぬりえ用のプロンプト（NSFW回避強化版）
    const prompt = "children coloring book page, simple black and white line drawing, cute cartoon style, thick outlines, family-friendly, educational, innocent, wholesome, suitable for kids ages 3-6, simple shapes, clean art";
    const negativePrompt = "nsfw, adult content, inappropriate, sexual, violence, scary, dark, realistic human figures, complex details, photographic, blurry, noisy";

    // より安全で子ども向けに特化したモデル
    const modelVersions = [
      // 1. 安全性重視のControlNet
      "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56472a247b",
      // 2. 線画特化モデル
      "435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117", 
      // 3. 最もシンプルなControlNet
      "9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3"
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
              num_inference_steps: 15, // 少なめに設定（安全性向上）
              guidance_scale: 6.0, // 低めに設定（プロンプト遵守度を下げる）
              controlnet_conditioning_scale: 0.8, // 元画像の影響を少し下げる
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