// netlify/functions/generate-coloring.js
// 超シンプル版

exports.handler = async (event, context) => {
    console.log('Function called!', event.httpMethod);
  
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Hello from Function!',
        timestamp: new Date().toISOString()
      })
    };
  };