// netlify/functions/generate-coloring.js
// デバッグ強化版

exports.handler = async (event, context) => {
    console.log('=== FUNCTION START ===');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);
    console.log('Query:', event.queryStringParameters);
    console.log('Headers:', JSON.stringify(event.headers, null, 2));
    console.log('Body length:', event.body ? event.body.length : 0);
    console.log('Raw body type:', typeof event.body);
  
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    };
  
    // OPTIONS (プリフライト) リクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      console.log('CORS OPTIONS request');
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
  
    // POSTかどうかチェック
    if (event.httpMethod === 'POST') {
      console.log('POST request received - this is correct!');
      
      if (event.body) {
        try {
          const data = JSON.parse(event.body);
          console.log('JSON parsed successfully');
          console.log('Data keys:', Object.keys(data));
          console.log('Has imageData:', !!data.imageData);
          if (data.imageData) {
            console.log('ImageData length:', data.imageData.length);
            console.log('ImageData starts with:', data.imageData.substring(0, 50));
          }
        } catch (parseError) {
          console.error('JSON parse failed:', parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON' })
          };
        }
      } else {
        console.log('No body in POST request');
      }
    } else {
      console.log('Method is not POST:', event.httpMethod);
    }
  
    console.log('=== FUNCTION END ===');
  
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Processed ${event.httpMethod} request successfully`,
        timestamp: new Date().toISOString(),
        method: event.httpMethod,
        bodyReceived: !!event.body
      })
    };
  };