import axios from 'axios';

class StableDiffusionAPI {
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
      timeout: 120000, // 画像生成は時間がかかるため2分タイムアウト
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

  // 画像生成（txt2img）
  async generateImage(positivePrompt, negativePrompt = '', options = {}) {
    this.checkClient();
    try {
      const defaultParams = {
        width: 512,
        height: 768,
        steps: 30,
        cfg_scale: 7,
        sampler_index: "DPM++ 2M Karras",
        batch_size: 1,
      };
      
      const payload = {
        prompt: positivePrompt,
        negative_prompt: negativePrompt,
        ...defaultParams,
        ...options
      };

      const response = await this.client.post('/sdapi/v1/txt2img', payload);
      const images = response.data.images || [];
      
      if (images.length === 0) {
        throw new Error('No images were generated');
      }
      
      return {
        base64Images: images,
        parameters: response.data.parameters,
        info: response.data.info
      };
    } catch (error) {
      console.error('Image generation failed:', error);
      throw error;
    }
  }
  
  // 利用可能なサンプラーの取得
  async getSamplers() {
    this.checkClient();
    try {
      const response = await this.client.get('/sdapi/v1/samplers');
      return response.data;
    } catch (error) {
      console.error('Failed to get samplers:', error);
      throw error;
    }
  }
  
  // モデル一覧の取得
  async getModels() {
    this.checkClient();
    try {
      const response = await this.client.get('/sdapi/v1/sd-models');
      return response.data;
    } catch (error) {
      console.error('Failed to get models:', error);
      throw error;
    }
  }
  
  // 接続テスト
  async testConnection() {
    try {
      this.checkClient();
      await this.getSamplers();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// シングルトンインスタンス
const sdAPI = new StableDiffusionAPI('');

export default sdAPI;