import axios from 'axios';

class KoboldAPI {
  constructor(baseURL) {
    this.baseURL = baseURL || '';
    this.client = null;
    this.createClient();
  }
  
  // クライアント作成
  createClient() {
    if (!this.baseURL) {
      this.client = null;
      return;
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // API URLの更新
  updateBaseURL(newBaseURL) {
    this.baseURL = newBaseURL;
    this.createClient();
  }

  // エラーチェック
  checkClient() {
    if (!this.client) {
      throw new Error('API URL is not configured. Please set it in the settings.');
    }
  }

  // モデル情報の取得
  async getModelInfo() {
    this.checkClient();
    try {
      const response = await this.client.get('/api/v1/model');
      return response.data;
    } catch (error) {
      console.error('Failed to get model info:', error);
      throw error;
    }
  }

  // テキスト生成
  async generateText(prompt, parameters = {}) {
    try {
      await this.checkClient();
      
      console.log('Sending prompt to LLM:', prompt);
      
      const requestBody = {
        prompt: prompt,
        max_length: parameters.max_length || 200,
        // 他のパラメータ...
      };
      
      const response = await this.client.post('/api/v1/generate', requestBody);
      console.log('Raw API response:', response.data);
      
      // レスポンスの構造を確認
      if (!response.data || !response.data.results || response.data.results.length === 0) {
        console.error('Empty response from API:', response.data);
        throw new Error('LLM からの応答が空でした');
      }
      
      const generatedText = response.data.results[0].text;
      console.log('Generated text:', generatedText);
      
      return generatedText;
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }
  
  // プロンプトエンジニアリング用の特殊関数
  async generateImagePrompt(description, character) {
    this.checkClient();
    try {
      const prompt = `
以下の文章からStable Diffusionで高品質な画像を生成するためのプロンプトを作成してください。
シーン説明: ${description}

キャラクター情報:
${character ? character.description : ''}

以下の形式でプロンプトを作成してください:
1. ポジティブプロンプト - 画像に含めるべき要素
2. ネガティブプロンプト - 画像に含めるべきでない要素

AIイラストに適した詳細な英語のプロンプトを作成してください。
`;

      const response = await this.generateText(prompt, { max_length: 500 });
      return this.parseImagePrompt(response);
    } catch (error) {
      console.error('Image prompt generation failed:', error);
      throw error;
    }
  }
  
  // プロンプトパース関数
  parseImagePrompt(text) {
    // 単純な実装 - 実際には正規表現やより堅牢なパーシングが必要
    const lines = text.split('\n');
    let positivePrompt = '';
    let negativePrompt = '';
    let inPositive = false;
    let inNegative = false;
    
    for (const line of lines) {
      if (line.toLowerCase().includes('ポジティブプロンプト') || line.toLowerCase().includes('positive prompt')) {
        inPositive = true;
        inNegative = false;
        continue;
      }
      if (line.toLowerCase().includes('ネガティブプロンプト') || line.toLowerCase().includes('negative prompt')) {
        inPositive = false;
        inNegative = true;
        continue;
      }
      
      if (inPositive) {
        positivePrompt += line + ' ';
      } else if (inNegative) {
        negativePrompt += line + ' ';
      }
    }
    
    return {
      positive: positivePrompt.trim(),
      negative: negativePrompt.trim()
    };
  }
  
  // 接続テスト
  async testConnection() {
    try {
      this.checkClient();
      await this.getModelInfo();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // generateChatResponseメソッド内の処理を確認
  async generateChatResponse(character, persona, messages, userMessage) {
    if (!character || !persona) {
      throw new Error('キャラクターとペルソナの情報が必要です');
    }
    
    try {
      // プロンプトを構築
      const prompt = promptBuilder.buildChatPrompt(
        character,
        persona,
        messages,
        userMessage
      );
      
      console.log('Chat prompt for LLM:', prompt);
      
      // 文章生成を実行
      const response = await this.generateText(prompt, { 
        max_length: 300,
        temperature: 0.8,
        top_p: 0.9 
      });
      
      console.log('Raw LLM response:', response);
      
      // レスポンスが空でないかチェック
      if (!response || response.trim() === '') {
        console.error('Empty response received');
        throw new Error('LLMから空の応答が返されました');
      }
      
      return response;
    } catch (error) {
      console.error('Chat response generation failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const koboldAPI = new KoboldAPI('');

export default koboldAPI;