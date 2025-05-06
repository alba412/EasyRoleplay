// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Reactアプリから安全に使えるIPCチャネルを定義
contextBridge.exposeInMainWorld('electronAPI', {
  // キャラクター関連
  getCharacters: () => ipcRenderer.invoke('get-characters'),
  saveCharacter: (character) => ipcRenderer.invoke('save-character', character),
  deleteCharacter: (characterId) => ipcRenderer.invoke('delete-character', characterId),
  
  // ペルソナ関連
  getPersonas: () => ipcRenderer.invoke('get-personas'),
  savePersona: (persona) => ipcRenderer.invoke('save-persona', persona),
  deletePersona: (personaId) => ipcRenderer.invoke('delete-persona', personaId),
  
  // チャット関連
  getChatSessions: () => ipcRenderer.invoke('get-chat-sessions'),
  saveChatSession: (session) => ipcRenderer.invoke('save-chat-session', session),
  deleteChatSession: (sessionId) => ipcRenderer.invoke('delete-chat-session', sessionId),
  
  // 設定関連
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // 画像関連
  saveImage: (imageData, filename) => ipcRenderer.invoke('save-image', imageData, filename)
});