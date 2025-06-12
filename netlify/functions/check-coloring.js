exports.handler = async (event) => {
const { getStore } = (await import('@netlify/blobs')).getStore
? await import('@netlify/blobs')          // 普通に取れる
: (await import('@netlify/blobs')).default; // fallback

  
    const jobId = event.queryStringParameters.id;
    const data  = await store.get(jobId);
    if (!data) return { statusCode: 404, headers: cors, body: 'not found' };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  };