// netlify/functions/start-dalle-job.js
// より確実なシンプル版
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== START DALLE JOB SIMPLE ===');
  
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

    console.log('Image data received, starting processing...');

    // 簡単なジョブIDを生成
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated job ID:', jobId);

    // 実際の処理を非同期で開始（Promiseで処理）
    processImageAsync(jobId, imageData);

    // 即座にジョブIDを返す
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId: jobId,
        status: 'processing',
        message: 'Image processing started'
      }),
    };

  } catch (error) {
    console.error('Start job error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to start job',
        details: error.message
      }),
    };
  }
};

// グローバルな結果保存オブジェクト
global.jobResults = global.jobResults || new Map();

// 非同期画像処理
async function processImageAsync(jobId, imageData) {
  try {
    console.log('=== ASYNC PROCESSING START ===', jobId);
    
    // 初期状態を設定
    global.jobResults.set(jobId, { 
      status: 'processing', 
      progress: 10,
      message: 'Starting analysis...'
    });

    // OpenAI API Key確認
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Step 1: 簡単な物体検出
    let detectedObject = "cute animal";
    
    try {
      console.log('Starting simple analysis...');
      global.jobResults.set(jobId, { 
        status: 'processing', 
        progress: 30,
        message: 'Analyzing image...'
      });

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
                  text: "この画像に写っている動物や物を1つの英単語で答えてください。例: cat, dog, rabbit, flower"
                },
                {
                  type: "image_url",
                  image_url: { url: imageData }
                }
              ]
            }
          ],
          max_tokens: 10
        }),
      });

      if (visionResponse.ok) {
        const visionResult = await visionResponse.json();
        detectedObject = visionResult.choices[0].message.content.trim().toLowerCase();
        console.log('Detected:', detectedObject);
      }
    } catch (visionError) {
      console.log('Vision failed, using default:', visionError.message);
    }

    // Step 2: DALL-E 3で線画生成
    console.log('Starting DALL-E 3...');
    global.jobResults.set(jobId, { 
      status: 'processing', 
      progress: 60,
      message: 'Generating coloring page...'
    });

    const dallePrompt = `Simple black and white line drawing coloring book page of a cute ${detectedObject}. Thick black outlines only, white background, no colors, no shading. Kawaii chibi style with big round eyes. Clean line art for children ages 3-6. NO COLORS - only black lines on white background.`;

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
        style: "natural",
        response_format: "url"
      }),
    });

    const dalleResult = await dalleResponse.json();

    if (dalleResponse.ok) {
      // 成功
      console.log('DALL-E generation successful for job:', jobId);
      global.jobResults.set(jobId, {
        status: 'completed',
        progress: 100,
        imageUrl: dalleResult.data[0].url,
        detectedObject: detectedObject,
        model: 'DALL-E-3-Simple'
      });
    } else {
      // DALL-E失敗
      console.error('DALL-E failed:', dalleResult);
      global.jobResults.set(jobId, {
        status: 'failed',
        progress: 0,
        error: dalleResult.error?.message || 'Image generation failed'
      });
    }

  } catch (error) {
    console.error('Async processing error for job:', jobId, error);
    global.jobResults.set(jobId, {
      status: 'failed',
      progress: 0,
      error: error.message
    });
  }
}