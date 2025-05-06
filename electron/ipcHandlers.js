// electron/ipcHandlers.js
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Store = require('electron-store');

// 設定ストア
const store = new Store();

module.exports = function(ipcMain, userDataPath) {
  // キャラクター関連ハンドラー
  ipcMain.handle('get-characters', async () => {
    try {
      const charactersDir = path.join(userDataPath, 'characters');
      const files = await fs.readdir(charactersDir);
      const characters = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(charactersDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          characters.push(JSON.parse(content));
        }
      }
      
      return characters;
    } catch (error) {
      console.error('Failed to get characters:', error);
      return [];
    }
  });
  
  ipcMain.handle('save-character', async (_, character) => {
    try {
      if (!character.id) {
        character.id = uuidv4();
      }
      
      const charactersDir = path.join(userDataPath, 'characters');
      const filePath = path.join(charactersDir, `${character.id}.json`);
      
      await fs.writeFile(filePath, JSON.stringify(character, null, 2));
      return character;
    } catch (error) {
      console.error('Failed to save character:', error);
      throw error;
    }
  });
  
  ipcMain.handle('delete-character', async (_, characterId) => {
    try {
      const charactersDir = path.join(userDataPath, 'characters');
      const filePath = path.join(charactersDir, `${characterId}.json`);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete character:', error);
      throw error;
    }
  });
  
  // ペルソナ関連ハンドラー
  ipcMain.handle('get-personas', async () => {
    try {
      const personasDir = path.join(userDataPath, 'personas');
      const files = await fs.readdir(personasDir);
      const personas = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(personasDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          personas.push(JSON.parse(content));
        }
      }
      
      return personas;
    } catch (error) {
      console.error('Failed to get personas:', error);
      return [];
    }
  });
  
  ipcMain.handle('save-persona', async (_, persona) => {
    try {
      if (!persona.id) {
        persona.id = uuidv4();
      }
      
      const personasDir = path.join(userDataPath, 'personas');
      const filePath = path.join(personasDir, `${persona.id}.json`);
      
      await fs.writeFile(filePath, JSON.stringify(persona, null, 2));
      return persona;
    } catch (error) {
      console.error('Failed to save persona:', error);
      throw error;
    }
  });
  
  ipcMain.handle('delete-persona', async (_, personaId) => {
    try {
      const personasDir = path.join(userDataPath, 'personas');
      const filePath = path.join(personasDir, `${personaId}.json`);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete persona:', error);
      throw error;
    }
  });
  
  // チャットセッション関連ハンドラー
  ipcMain.handle('get-chat-sessions', async () => {
    try {
      const chatsDir = path.join(userDataPath, 'chats');
      const files = await fs.readdir(chatsDir);
      const sessions = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(chatsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          sessions.push(JSON.parse(content));
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return [];
    }
  });
  
  ipcMain.handle('save-chat-session', async (_, session) => {
    try {
      if (!session.id) {
        session.id = uuidv4();
      }
      
      const chatsDir = path.join(userDataPath, 'chats');
      const filePath = path.join(chatsDir, `${session.id}.json`);
      
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
      return session;
    } catch (error) {
      console.error('Failed to save chat session:', error);
      throw error;
    }
  });
  
  ipcMain.handle('delete-chat-session', async (_, sessionId) => {
    try {
      const chatsDir = path.join(userDataPath, 'chats');
      const filePath = path.join(chatsDir, `${sessionId}.json`);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  });
  
  // 設定関連ハンドラー
  ipcMain.handle('get-settings', async () => {
    return store.get('settings') || {};
  });
  
  ipcMain.handle('save-settings', async (_, settings) => {
    store.set('settings', settings);
    return settings;
  });
  
  // 画像保存ハンドラー
  ipcMain.handle('save-image', async (_, imageData, filename) => {
    try {
      const imagesDir = path.join(userDataPath, 'images');
      const filePath = path.join(imagesDir, filename);
      
      // Base64データの場合はデコード
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  });
};