// netlify/functions/process-dalle-background.js
// バックグラウンドでDALL-E処理を実行
const fetch = require('node-fetch');

// 簡易的なジョブ結果保存（実際はデータベースを使用）
const jobResults = new Map();

exports.handler = async (event, context) => {
  console.log('=== BACKGROUND DALLE PROCESSING ===');
  
  // Background function として実行
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { jobId, imageData } = JSON.parse(event.body);
    console.log('Processing job:', jobId);
    
    // ジョブ状態を初期化
    jobResults.set(jobId, { status: 'processing', progress: 10 });

    // Step 1: GPT-4o Vision分析
    let animalType = "cute animal";
    let features = "adorable and friendly";

    try {
      console.log('Starting GPT-4o Vision analysis...');
      jobResults.set(jobId, { status: 'processing', progress: 30, message: 'Analyzing image...' });

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
                  text: "この画像に写っている動物や物を1つの英単語で答えてください。例: cat, dog, rabbit, flower, car など"
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
        animalType = visionResult.choices[0].message.content.trim().toLowerCase();
        console.log('Detected object:', animalType);
      }
    } catch (visionError) {
      console.log('Vision analysis failed, using default');
    }

    // Step 2: DALL-E 3で線画生成
    console.log('Starting DALL-E 3 generation...');
    jobResults.set(jobId, { status: 'processing', progress: 60, message: 'Generating coloring page...' });

    const dallePrompt = `Simple black and white line drawing coloring book page of a cute ${animalType}. Thick black outlines only, white background, no colors, no shading. Kawaii chibi style with big round eyes. Clean line art for children ages 3-6. NO COLORS - only black lines.`;

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
      console.log('DALL-E generation successful');
      jobResults.set(jobId, {
        status: 'completed',
        progress: 100,
        imageUrl: dalleResult.data[0].url,
        detectedObject: animalType,
        model: 'DALL-E-3-Async'
      });
    } else {
      // 失敗
      console.error('DALL-E generation failed:', dalleResult);
      jobResults.set(jobId, {
        status: 'failed',
        progress: 0,
        error: dalleResult.error?.message || 'Image generation failed'
      });
    }

    console.log('Background processing completed for job:', jobId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Background processing completed' })
    };

  } catch (error) {
    console.error('Background processing error:', error);
    
    if (event.body) {
      const { jobId } = JSON.parse(event.body);
      jobResults.set(jobId, {
        status: 'failed',
        progress: 0,
        error: error.message
      });
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ジョブ結果を取得する関数（他のFunctionから呼び出し可能）
global.getJobResult = (jobId) => {
  return jobResults.get(jobId) || { status: 'not_found' };
};