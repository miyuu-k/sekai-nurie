const FormData     = require('form-data');
const fetchN       = (...a) => import('node-fetch').then(({default:f}) => f(...a));

exports.handler = async (event) => {
// 共通ヘルパ 1 行（各 Function の handler 内ならどこに置いても OK）
const { getStore } = (await import('@netlify/blobs')).getStore
                   ? await import('@netlify/blobs')          // 普通に取れる
                   : (await import('@netlify/blobs')).default; // fallback

  const store = getStore('jobs');

  const jobId = event.queryStringParameters.id;
  const data  = await store.get(jobId);           // ← ★ ここで get

  if (!data) return { statusCode: 404, body: 'job not found' };
  const { imageData, maskData } = data;    

  /* ---- OpenAI /images/edits ---- */
  const form = new FormData();
  const img  = Buffer.from(imageData.split(',')[1], 'base64');
  const mask = Buffer.from(maskData.split(',')[1],  'base64');
  form.append('image', img,  { filename:'img.png', contentType:'image/png' });
  form.append('mask',  mask, { filename:'mask.png', contentType:'image/png' });
  form.append('prompt',
    'Make it into a line drawing for coloring, for children up to 6 years old, ' +
    'use thick lines, black and white, and cutely deformed.');
  form.append('model', 'dall-e-2');
  form.append('size',  '512x512');
  form.append('n', 1);
  form.append('response_format', 'url');

  const resp = await fetchN('https://api.openai.com/v1/images/edits', {
    method:'POST',
    headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,
              ...form.getHeaders() },
    body: form
  });
  const json = await resp.json();

  await store.set(jobId, { status: 'done', imageUrl });
  return { statusCode: 200, body: 'ok' };
};
