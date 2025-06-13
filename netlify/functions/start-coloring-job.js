// netlify/functions/start-coloring-job.js
// ハイブリッドアプローチ: 画像分析 → 可愛いぬりえ生成
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

    console.log('Starting hybrid approach: analyzing image...');

    // Step 1: GPT-4 Visionで画像を分析
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "この画像に写っているものを1つの単語で答えてください。動物の場合は動物名（例：cat, dog, rabbit）、物の場合は物の名前（例：flower, car, ball）を英語で答えてください。1単語のみでお答えください。"
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
        max_tokens: 10
      }),
    });

    let detectedObject = "animal"; // デフォルト値

    if (visionResponse.ok) {
      const visionResult = await visionResponse.json();
      detectedObject = visionResult.choices[0].message.content.trim().toLowerCase();
      console.log('Detected object:', detectedObject);
    } else {
      console.log('Vision analysis failed, using default');
    }

    // Step 2: 検出されたオブジェクトに基づいて可愛いぬりえを生成
    const coloringPrompt = `cute kawaii ${detectedObject} coloring book page for toddlers and young children, simple thick black outlines only, big round kawaii eyes, baby style, chibi cartoon proportions, minimal details inside shapes, clean simple line art, suitable for ages 3-6, no shading or colors, just black outlines on white background, adorable cartoon style`;

    const negativePrompt = "realistic, detailed, complex, photographic, shading, gradients, colors, filled areas, adult coloring book, intricate patterns, fine details, scary, dark, nsfw";

    // 可愛いぬりえ生成用のモデル
    const coloringModels = [
      // 1. Stable Diffusion (text-to-image)
      "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
      // 2. より新しいSD model
      "27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
      // 3. フォールバック
      "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf"
    ];

    let lastError = null;

    // 複数のモデルを試行
    for (let i = 0; i < coloringModels.length; i++) {
      try {
        console.log(`Trying coloring model ${i + 1}/${coloringModels.length}`);

        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: coloringModels[i],
            input: {
              prompt: coloringPrompt,
              negative_prompt: negativePrompt,
              width: 512,
              height: 512,
              num_outputs: 1,
              num_inference_steps: 25,
              guidance_scale: 8.0,
              scheduler: "DPMSolverMultistep",
              seed: Math.floor(Math.random() * 1000000)
            }
          }),
        });

        const prediction = await response.json();

        if (response.ok && prediction.id) {
          console.log(`Coloring model ${i + 1} succeeded. Prediction started:`, prediction.id);
          
          // 成功した場合、ジョブIDと検出結果を返す
          return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
              jobId: prediction.id,
              status: 'processing',
              detectedObject: detectedObject,
              model: `Kawaii-Generator-${i + 1}`,
              message: `Generating cute ${detectedObject} coloring page`
            }),
          };
        } else {
          console.error(`Coloring model ${i + 1} failed:`, prediction);
          lastError = prediction;
        }

      } catch (error) {
        console.error(`Coloring model ${i + 1} error:`, error);
        lastError = error;
      }
    }

    // すべてのモデルが失敗した場合
    console.error('All coloring models failed');
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate cute coloring page',
        detectedObject: detectedObject,
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