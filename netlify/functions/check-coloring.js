exports.handler = async (event) => {
    const cors = { 'Access-Control-Allow-Origin':'*' };
  
    const blobsMod  = await import('@netlify/blobs');
    const getStore  = blobsMod.getStore ?? blobsMod.default?.getStore;
    if (!getStore) return { statusCode:500, headers:cors, body:'blobs API error' };
    const store     = getStore('jobs');
  
    const jobId = event.queryStringParameters.id;
    const data  = await store.get(jobId);
    if (!data) return { statusCode:404, headers:cors, body:'not found' };
  
    return { statusCode:200, headers:cors, body:JSON.stringify(data) };
  };
  