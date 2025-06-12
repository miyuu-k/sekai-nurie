const { put }   = require('@netlify/blobs');
const { nanoid } = require('nanoid');

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors };

  const { imageData, maskData } = JSON.parse(event.body || '{}');
  if (!imageData) return { statusCode: 400, headers: cors, body: 'imageData required' };

  const jobId = nanoid();
  await put(`jobs/${jobId}.json`, JSON.stringify({
    status: 'queued',
    imageData,
    maskData
  }), { metadata: { contentType: 'application/json' } });

  // 背景関数をキック（応答は待たずにすぐ返す）
  await fetch(`${process.env.URL}/.netlify/functions/worker-background?id=${jobId}`);

  return { statusCode: 202, headers: cors, body: JSON.stringify({ jobId }) };
};
