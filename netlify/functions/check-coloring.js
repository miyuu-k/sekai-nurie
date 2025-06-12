exports.handler = async (event) => {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('jobs');
  
    const jobId = event.queryStringParameters.id;
    const data  = await store.get(jobId);
    if (!data) return { statusCode: 404, headers: cors, body: 'not found' };
    return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
  };