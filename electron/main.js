// electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

// データディレクトリの確保
const userDataPath = app.getPath('userData');
const charactersDir = path.join(userDataPath, 'characters');
const personasDir = path.join(userDataPath, 'personas');
const chatsDir = path.join(userDataPath, 'chats');
const imagesDir = path.join(userDataPath, 'images');

[charactersDir, personasDir, chatsDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 開発環境ではローカルサーバーを、本番環境ではビルドしたファイルを読み込む
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPCハンドラー

// キャラクター関連ハンドラ
ipcMain.handle('get-characters', async () => {
  try {
    const files = fs.readdirSync(charactersDir);
    const characters = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(charactersDir, file), 'utf8');
        return JSON.parse(content);
      });
    return characters;
  } catch (error) {
    console.error('Failed to get characters:', error);
    return [];
  }
});

ipcMain.handle('save-character', async (_, character) => {
  try {
    if (!character.id) {
      character.id = Date.now().toString();
    }
    const filePath = path.join(charactersDir, `${character.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(character, null, 2), 'utf8');
    return character;
  } catch (error) {
    console.error('Failed to save character:', error);
    throw error;
  }
});

ipcMain.handle('delete-character', async (_, characterId) => {
  try {
    const filePath = path.join(charactersDir, `${characterId}.json`);
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete character:', error);
    throw error;
  }
});

// ペルソナ関連ハンドラ
ipcMain.handle('get-personas', async () => {
  try {
    const files = fs.readdirSync(personasDir);
    const personas = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(personasDir, file), 'utf8');
        return JSON.parse(content);
      });
    return personas;
  } catch (error) {
    console.error('Failed to get personas:', error);
    return [];
  }
});

ipcMain.handle('save-persona', async (_, persona) => {
  try {
    if (!persona.id) {
      persona.id = Date.now().toString();
    }
    const filePath = path.join(personasDir, `${persona.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(persona, null, 2), 'utf8');
    return persona;
  } catch (error) {
    console.error('Failed to save persona:', error);
    throw error;
  }
});

ipcMain.handle('delete-persona', async (_, personaId) => {
  try {
    const filePath = path.join(personasDir, `${personaId}.json`);
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete persona:', error);
    throw error;
  }
});

// チャットセッション関連ハンドラ
ipcMain.handle('get-chat-sessions', async () => {
  try {
    const files = fs.readdirSync(chatsDir);
    const sessions = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(chatsDir, file), 'utf8');
        return JSON.parse(content);
      });
    return sessions;
  } catch (error) {
    console.error('Failed to get chat sessions:', error);
    return [];
  }
});

ipcMain.handle('save-chat-session', async (_, session) => {
  try {
    if (!session.id) {
      session.id = Date.now().toString();
    }
    const filePath = path.join(chatsDir, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    return session;
  } catch (error) {
    console.error('Failed to save chat session:', error);
    throw error;
  }
});

ipcMain.handle('delete-chat-session', async (_, sessionId) => {
  try {
    const filePath = path.join(chatsDir, `${sessionId}.json`);
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete chat session:', error);
    throw error;
  }
});

// 設定関連ハンドラ
ipcMain.handle('get-settings', async () => {
  try {
    const settingsPath = path.join(userDataPath, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(content);
    }
    return {}; // デフォルト設定
  } catch (error) {
    console.error('Failed to get settings:', error);
    return {};
  }
});

ipcMain.handle('save-settings', async (_, settings) => {
  try {
    const settingsPath = path.join(userDataPath, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
});

// 画像関連ハンドラ
ipcMain.handle('save-image', async (_, imageData, filename) => {
  try {
    // Base64形式の画像データからバイナリへ変換
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 画像を保存
    const imagePath = path.join(imagesDir, filename);
    fs.writeFileSync(imagePath, buffer);
    
    // 相対パスを返す（アプリ内で使用するため）
    return path.relative(userDataPath, imagePath).replace(/\\/g, '/');
  } catch (error) {
    console.error('Failed to save image:', error);
    throw error;
  }
});