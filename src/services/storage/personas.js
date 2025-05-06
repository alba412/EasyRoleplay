const { v4: uuidv4 } = require('uuid');

class PersonaService {
  // ペルソナ一覧の取得
  async getPersonas() {
    try {
      return await window.electronAPI.getPersonas();
    } catch (error) {
      console.error('Failed to get personas:', error);
      return [];
    }
  }
  
  // ペルソナの取得
  async getPersona(id) {
    try {
      const personas = await this.getPersonas();
      return personas.find(persona => persona.id === id) || null;
    } catch (error) {
      console.error(`Failed to get persona with ID ${id}:`, error);
      return null;
    }
  }
  
  // ペルソナの保存
  async savePersona(persona) {
    try {
      // 新規作成の場合はIDを生成
      if (!persona.id) {
        persona.id = uuidv4();
      }
      
      return await window.electronAPI.savePersona(persona);
    } catch (error) {
      console.error('Failed to save persona:', error);
      throw error;
    }
  }
  
  // ペルソナの削除
  async deletePersona(id) {
    try {
      return await window.electronAPI.deletePersona(id);
    } catch (error) {
      console.error(`Failed to delete persona with ID ${id}:`, error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const personaService = new PersonaService();

export default personaService;