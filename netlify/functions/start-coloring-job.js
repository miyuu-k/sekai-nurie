// netlify/functions/start-coloring-job.js
// ステップ1: ジョブを開始して即座にレスポンス
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

    // 子ども向けぬりえ用のプロンプト
    const prompt = "simple black and white line drawing coloring book page for children, thick black outlines, cute and friendly style, no colors or shading, clean simple shapes, suitable for ages 3-6";
    const negativePrompt = "color, colors, shading, realistic, complex details, photographic, blurry, noisy, dark, scary";

    // より確実に動作するControlNetモデルを使用
    const modelVersions = [
      // 1. 最新のControlNet Canny
      "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      // 2. 安定版ControlNet
      "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56472a247b",
      // 3. フォールバック用
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
              num_inference_steps: 20,
              guidance_scale: 7.5,
              controlnet_conditioning_scale: 1.0,
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
              model: `ControlNet-${i + 1}`,
              message: 'Image processing started successfully'
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
        error: 'All image processing models failed',
        details: lastError?.detail || lastError?.message || 'Unknown error',
        suggestion: 'Please try again in a few minutes'
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