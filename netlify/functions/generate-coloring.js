// netlify/functions/generate-coloring.js
const { Buffer } = require('node:buffer');
const FormData  = require('form-data');
const fetch     = (...a) => import('node-fetch').then(({default:f}) => f(...a));

exports.handler = async (event) => {
  /* ---------- CORS ---------- */
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: cors };

  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  /* ---------- 画像受け取り ---------- */
  const { imageData } = JSON.parse(event.body || '{}');
  if (!imageData)
    return { statusCode: 400, headers: cors, body: 'imageData required' };

  const img = Buffer.from(
    imageData.replace(/^data:.*;base64,/, ''), 'base64'
  );

  /* ---------- DALL-E 2 へ ---------- */
  const form = new FormData();
  form.append('image', img, { filename: 'photo.png', contentType: 'image/png' });
  form.append(
    'prompt',
    'Make it into a line drawing for coloring, for children up to 6 years old, ' +
    'use thick lines, black and white, and cutely deformed.'
  );
  form.append('model', 'dall-e-2');   // ← DALL-E 2 を明示
  form.append('n', 1);
  form.append('size', '512x512');
  form.append('response_format', 'url');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...form.getHeaders()
    },
    body: form
  });

  const json = await res.json();
  if (!res.ok)
    return { statusCode: res.status, headers: cors,
             body: JSON.stringify({ error: 'OpenAI error', details: json }) };

  /* ---------- フロントへ返却 ---------- */
  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      success: true,            // ★ 既存フロントのチェックを満たす
      imageUrl: json.data[0].url
    })
  };
};
