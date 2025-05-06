import React, { createContext, useContext, useState } from 'react';

const ApiContext = createContext();

export function ApiProvider({ children }) {
  const [koboldUrl, setKoboldUrl] = useState('');
  const [sdUrl, setSdUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // 設定を保存
  const saveSettings = async (settings) => {
    try {
      await window.electronAPI.saveSettings(settings);
      setKoboldUrl(settings.koboldUrl || '');
      setSdUrl(settings.sdUrl || '');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  };

  // 設定を読み込み
  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      setKoboldUrl(settings.koboldUrl || '');
      setSdUrl(settings.sdUrl || '');
      return settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  };

  // 接続テスト
  const testConnection = async () => {
    try {
      // 実際の接続テストロジックをここに実装
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
      return false;
    }
  };

  const value = {
    koboldUrl,
    sdUrl,
    isConnected,
    saveSettings,
    loadSettings,
    testConnection
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export const useApiContext = () => useContext(ApiContext);