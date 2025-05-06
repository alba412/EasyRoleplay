const { v4: uuidv4 } = require('uuid');

class CharacterService {
  // キャラクター一覧の取得
  async getCharacters() {
    try {
      return await window.electronAPI.getCharacters();
    } catch (error) {
      console.error('Failed to get characters:', error);
      return [];
    }
  }
  
  // キャラクターの取得
  async getCharacter(id) {
    try {
      const characters = await this.getCharacters();
      return characters.find(character => character.id === id) || null;
    } catch (error) {
      console.error(`Failed to get character with ID ${id}:`, error);
      return null;
    }
  }
  
  // キャラクターの保存
  async saveCharacter(character) {
    try {
      // 新規作成の場合はIDを生成
      if (!character.id) {
        character.id = uuidv4();
      }
      
      return await window.electronAPI.saveCharacter(character);
    } catch (error) {
      console.error('Failed to save character:', error);
      throw error;
    }
  }
  
  // キャラクターの削除
  async deleteCharacter(id) {
    try {
      return await window.electronAPI.deleteCharacter(id);
    } catch (error) {
      console.error(`Failed to delete character with ID ${id}:`, error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const characterService = new CharacterService();

export default characterService;