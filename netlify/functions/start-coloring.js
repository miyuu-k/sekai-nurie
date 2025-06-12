// --- ② CORS 定数も今まで通りで OK ---
const cors = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// --- ③ handler の中で @netlify/blobs を動的 import ---
exports.handler = async (event) => {
  const { nanoid } = await import('nanoid');     // ← 最初に
  const { set }    = await import('@netlify/blobs');

  /* ===== ここから下は元のロジックと同じ ===== */
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: cors };

  const { imageData, maskData } = JSON.parse(event.body || '{}');
  if (!imageData)
    return { statusCode: 400, headers: cors, body: 'imageData required' };

  const jobId = nanoid();

  await set(
    `jobs/${jobId}.json`,
    JSON.stringify({ status:'queued', imageData, maskData }),
    { metadata:{ contentType:'application/json' } }
  );

  await fetch(`${process.env.URL}/.netlify/functions/worker-background?id=${jobId}`);
  return { statusCode:202, headers:cors, body:JSON.stringify({ jobId }) };
};
