const { v4: uuidv4 } = require('uuid');

class ChatService {
  // チャットセッション一覧の取得
  async getChatSessions() {
    try {
      return await window.electronAPI.getChatSessions();
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return [];
    }
  }
  
  // チャットセッションの取得
  async getChatSession(id) {
    try {
      const sessions = await this.getChatSessions();
      return sessions.find(session => session.id === id) || null;
    } catch (error) {
      console.error(`Failed to get chat session with ID ${id}:`, error);
      return null;
    }
  }
  
  // チャットセッションの保存
  async saveChatSession(session) {
    try {
      // 新規作成の場合はIDを生成
      if (!session.id) {
        session.id = uuidv4();
      }
      
      return await window.electronAPI.saveChatSession(session);
    } catch (error) {
      console.error('Failed to save chat session:', error);
      throw error;
    }
  }
  
  // チャットセッションの削除
  async deleteChatSession(id) {
    try {
      return await window.electronAPI.deleteChatSession(id);
    } catch (error) {
      console.error(`Failed to delete chat session with ID ${id}:`, error);
      throw error;
    }
  }
  
  // 画像の保存
  async saveImage(imageData) {
    try {
      const filename = `image_${Date.now()}.png`;
      const imagePath = await window.electronAPI.saveImage(imageData, filename);
      return imagePath;
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const chatService = new ChatService();

export default chatService;