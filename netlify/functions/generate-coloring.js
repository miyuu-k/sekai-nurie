// netlify/functions/generate-coloring.js
// CORS対応版

exports.handler = async (event, context) => {
    console.log('Function called!', event.httpMethod, event.path);
  
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    };
  
    // OPTIONS (プリフライト) リクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
  
    console.log('Processing request:', event.httpMethod);
    console.log('Headers:', event.headers);
    console.log('Body length:', event.body ? event.body.length : 0);
  
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Hello from ${event.httpMethod} request!`,
        timestamp: new Date().toISOString(),
        method: event.httpMethod
      })
    };
  };