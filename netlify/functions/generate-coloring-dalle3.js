async function generateColoring() {
  console.log('=== generateColoring function called ===');
  
  if (!selectedFile) {
      console.error('No file selected');
      showError('まず しゃしんを えらんでね！');
      return;
  }

  console.log('Selected file:', selectedFile.name, selectedFile.size);

  // ローディング表示開始
  loadingContainer.style.display = 'block';
  generateButton.disabled = true;
  resultContainer.style.display = 'none';
  hideError();
  
  // プログレスバー表示
  progressContainer.style.display = 'block';
  updateProgress(0, 'しゃしんを あっぷろーどしています...');

  try {
      console.log('Starting image processing...');
      
      // 画像をBase64に変換
      updateProgress(10, 'しゃしんを じゅんびしています...');
      
      let imageData;
      try {
          console.log('Converting to base64...');
          imageData = await fileToBase64(selectedFile);
          console.log('Base64 conversion completed, length:', imageData.length);
          console.log('Base64 starts with:', imageData.substring(0, 50));
      } catch (base64Error) {
          console.error('Base64 conversion error:', base64Error);
          throw new Error('画像の変換に失敗しました: ' + base64Error.message);
      }
      
      updateProgress(20, 'DALL-E 3 で かいせきしています...');
      
      const functionUrl = '/.netlify/functions/generate-coloring-dalle3';
      console.log('Preparing to call function:', functionUrl);
      
      const requestBody = JSON.stringify({ imageData: imageData });
      console.log('Request body prepared, size:', requestBody.length);
      
      let response;
      try {
          console.log('Calling fetch...');
          
          // DALL-E 3 Functionを呼び出し（即座に結果が返る）
          response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: requestBody
          });
          
          console.log('Fetch completed successfully');
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          console.log('Response type:', response.type);
          console.log('Response url:', response.url);
          
      } catch (fetchError) {
          console.error('=== FETCH ERROR ===');
          console.error('Error type:', fetchError.name);
          console.error('Error message:', fetchError.message);
          console.error('Error stack:', fetchError.stack);
          throw new Error('サーバーへの接続に失敗しました: ' + fetchError.message);
      }

      if (!response.ok) {
          let errorText = '';
          try {
              errorText = await response.text();
              console.error('Response error text:', errorText);
          } catch (textError) {
              console.error('Could not read error text:', textError);
          }
          throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
      }

      let result;
      try {
          result = await response.json();
          console.log('Parsed result:', result);
      } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          const responseText = await response.text();
          console.error('Response was:', responseText);
          throw new Error('Invalid JSON response from server');
      }
      
      updateProgress(100, 'ぬりえが できました！');

      if (result.success && result.imageUrl) {
          generatedImageUrl = result.imageUrl;
          showResult(result.imageUrl, result.model, result.detectedObject);
      } else {
          throw new Error('画像の生成に失敗しました');
      }
      
  } catch (error) {
      console.error('=== MAIN ERROR HANDLER ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Selected file:', selectedFile);
      
      showError(`エラーが発生しました 😢\n\n${error.message}\n\nブラウザのコンソールを確認してください。`);
  } finally {
      loadingContainer.style.display = 'none';
      generateButton.disabled = false;
      progressContainer.style.display = 'none';
  }
}