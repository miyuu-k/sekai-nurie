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

    // Replicate APIでジョブを開始（結果を待たない）
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
      console.error('Failed to start prediction:', prediction);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to start image processing',
          details: prediction.detail || 'Unknown error'
        }),
      };
    }

    console.log('Prediction started:', prediction.id);

    // ジョブIDを即座に返す（タイムアウト回避）
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId: prediction.id,
        status: 'processing',
        message: 'Image processing started successfully'
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