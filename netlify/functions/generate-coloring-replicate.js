// netlify/functions/generate-coloring-replicate.js
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

    console.log('Starting line art conversion with Replicate...');

    // 子ども向けぬりえ用のプロンプト
    const prompt = "simple black and white line drawing coloring book page for children, thick black outlines, cute and friendly style, no colors or shading, clean simple shapes, suitable for ages 3-6";
    
    const negativePrompt = "color, colors, shading, realistic, complex details, photographic, blurry, noisy, dark, scary";

    // Replicate APIで線画変換を実行
    // ControlNet Cannyモデルを使用
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613",
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

    if (!response.ok) {
      console.error('Replicate API Error:', prediction);
      
      // エラーの場合、フォールバックモデルを試す
      return await tryFallbackModel(imageData, headers);
    }

    console.log('Prediction started:', prediction.id);

    // 結果を待機（ポーリング）
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30; // 最大3分待機

    while (result.status === 'starting' || result.status === 'processing') {
      if (attempts >= maxAttempts) {
        return {
          statusCode: 408,
          headers,
          body: JSON.stringify({ 
            error: 'Processing timeout',
            details: 'Image processing took too long (over 3 minutes)'
          }),
        };
      }

      // 6秒間隔で結果をチェック
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      result = await statusResponse.json();
      attempts++;
      
      console.log(`Attempt ${attempts}: Status = ${result.status}`);
    }

    if (result.status === 'succeeded' && result.output && result.output.length > 0) {
      console.log('Line art conversion completed successfully');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: result.output[0],
          predictionId: result.id,
          model: 'ControlNet Canny'
        }),
      };
    } else {
      console.error('Prediction failed:', result);
      
      // 失敗した場合、フォールバックを試す
      return await tryFallbackModel(imageData, headers);
    }

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

// フォールバックモデル（別のControlNetモデル）
async function tryFallbackModel(imageData, headers) {
  try {
    console.log('Trying fallback model...');
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56472a247b",
        input: {
          image: imageData,
          prompt: "black and white line drawing, coloring book style, simple outlines for children",
          negative_prompt: "color, shading, complex",
          num_outputs: 1,
          num_inference_steps: 15,
          guidance_scale: 7.0,
          controlnet_conditioning_scale: 1.0
        }
      }),
    });

    let prediction = await response.json();

    if (!response.ok) {
      throw new Error('Fallback model also failed');
    }

    // 短時間待機（フォールバック用）
    for (let i = 0; i < 20; i++) {
      if (prediction.status === 'succeeded') break;
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
      
      prediction = await statusResponse.json();
    }

    if (prediction.status === 'succeeded' && prediction.output && prediction.output.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: prediction.output[0],
          predictionId: prediction.id,
          model: 'ControlNet Fallback'
        }),
      };
    }

    throw new Error('Fallback model failed');

  } catch (error) {
    console.error('Fallback model error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'All models failed',
        details: `Primary and fallback models both failed: ${error.message}`
      }),
    };
  }
}