// netlify/functions/test-replicate.js
// テスト用Function - APIキーが正しく設定されているか確認

exports.handler = async (event, context) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
  
    try {
      // APIキーの存在確認
      const apiToken = process.env.REPLICATE_API_TOKEN;
      
      if (!apiToken) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'REPLICATE_API_TOKEN not found',
            message: 'Environment variable is not set correctly'
          }),
        };
      }
  
      // APIキーの形式確認
      if (!apiToken.startsWith('r8_')) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid API token format',
            message: 'Token should start with r8_'
          }),
        };
      }
  
      // 簡単なAPI疎通確認
      const fetch = require('node-fetch');
      
      const response = await fetch('https://api.replicate.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (response.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Replicate API connection successful!',
            tokenLength: apiToken.length,
            tokenPrefix: apiToken.substring(0, 8) + '...'
          }),
        };
      } else {
        const errorData = await response.json();
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: 'API connection failed',
            details: errorData
          }),
        };
      }
  
    } catch (error) {
      console.error('Test Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Test function error',
          details: error.message
        }),
      };
    }
  };