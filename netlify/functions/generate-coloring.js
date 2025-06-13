// netlify/functions/generate-coloring.js
// POST処理テスト版

exports.handler = async (event, context) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
  
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      };
    }
  
    try {
      console.log('POST request received');
      console.log('Event body:', event.body);
  
      // POSTデータの解析テスト
      let requestData = {};
      if (event.body) {
        try {
          requestData = JSON.parse(event.body);
          console.log('Parsed request data:', Object.keys(requestData));
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON in request body' }),
          };
        }
      }
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'POST processing works!',
          receivedData: {
            hasImageData: !!requestData.imageData,
            imageDataLength: requestData.imageData ? requestData.imageData.length : 0,
            bodyLength: event.body ? event.body.length : 0
          }
        }),
      };
  
    } catch (error) {
      console.error('Function Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: error.message
        }),
      };
    }
  };