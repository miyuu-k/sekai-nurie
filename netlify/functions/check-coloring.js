const { get } = require('@netlify/blobs');

exports.handler = async (event) => {
  const cors = { 'Access-Control-Allow-Origin': '*' };
  const jobId = event.queryStringParameters.id;
  if (!jobId) return { statusCode: 400, headers: cors, body: 'id required' };

  const raw = await get(`jobs/${jobId}.json`);
  if (!raw) return { statusCode: 404, headers: cors, body: 'not found' };

  return { statusCode: 200, headers: cors, body: raw };
};
