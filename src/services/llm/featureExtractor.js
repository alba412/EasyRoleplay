import koboldAPI from '../api/kobold';
import promptBuilder from './promptBuilder';

/**
 * キャラクターの特徴を抽出するサービス
 */
class FeatureExtractor {
  /**
   * キャラクター記述から身体的特徴を抽出
   * @param {string} description キャラクターの説明
   * @returns {Object} 抽出された特徴
   */
  async extractFeatures(description) {
    try {
      // 特徴抽出用のプロンプトを構築
      const prompt = promptBuilder.buildFeatureExtractionPrompt(description);
      
      // LLMを呼び出して特徴を抽出
      const response = await koboldAPI.generateText(prompt, { max_length: 500 });
      
      // 応答からJSON部分を抽出
      return this.parseFeatures(response);
    } catch (error) {
      console.error('Feature extraction failed:', error);
      // 失敗した場合は空のオブジェクトを返す
      return {
        hairColor: '',
        hairStyle: '',
        eyeColor: '',
        bodyType: '',
        skinTone: '',
        distinguishingFeatures: ''
      };
    }
  }
  
  /**
   * LLM応答からJSONを抽出
   * @param {string} text LLM応答テキスト
   * @returns {Object} 解析された特徴
   */
  parseFeatures(text) {
    try {
      // JSON形式の部分を探す
      const jsonMatch = text.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      // JSON形式が見つからない場合は空のオブジェクトを返す
      return {
        hairColor: '',
        hairStyle: '',
        eyeColor: '',
        bodyType: '',
        skinTone: '',
        distinguishingFeatures: ''
      };
    } catch (error) {
      console.error('Failed to parse features:', error);
      return {
        hairColor: '',
        hairStyle: '',
        eyeColor: '',
        bodyType: '',
        skinTone: '',
        distinguishingFeatures: ''
      };
    }
  }
}

// シングルトンインスタンス
const featureExtractor = new FeatureExtractor();

export default featureExtractor;