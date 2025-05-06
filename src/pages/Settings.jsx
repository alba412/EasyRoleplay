import React, { useState, useEffect } from 'react';
import koboldAPI from '../services/api/kobold';
import sdAPI from '../services/api/sd';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    kobold: {
      url: '',
      status: 'unknown' // unknown, connected, error
    },
    sd: {
      url: '',
      status: 'unknown' // unknown, connected, error
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  // 設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await window.electronAPI.getSettings();
        if (storedSettings) {
          setSettings({
            ...settings,
            kobold: {
              ...settings.kobold,
              url: storedSettings.kobold?.url || ''
            },
            sd: {
              ...settings.sd,
              url: storedSettings.sd?.url || ''
            }
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('設定の読み込みに失敗しました');
      }
    };

    loadSettings();
  }, []);

  // 入力変更ハンドラ
  const handleChange = (e, service) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [service]: {
        ...settings[service],
        [name]: value
      }
    });

    // 保存メッセージをクリア
    setSavedMessage('');
  };

  // 設定の保存
  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSavedMessage('');

    try {
      await window.electronAPI.saveSettings(settings);
      setSavedMessage('設定を保存しました');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 接続テスト
  const handleTestConnection = async (service) => {
    if (service !== 'kobold' && service !== 'sd') return;

    setIsLoading(true);
    setError(null);

    // ステータスをリセット
    setSettings({
      ...settings,
      [service]: {
        ...settings[service],
        status: 'unknown'
      }
    });

    try {
      // URLを更新
      if (service === 'kobold') {
        koboldAPI.updateBaseURL(settings.kobold.url);
        const connected = await koboldAPI.testConnection();

        setSettings({
          ...settings,
          kobold: {
            ...settings.kobold,
            status: connected ? 'connected' : 'error'
          }
        });
      } else if (service === 'sd') {
        sdAPI.updateBaseURL(settings.sd.url);
        const connected = await sdAPI.testConnection();

        setSettings({
          ...settings,
          sd: {
            ...settings.sd,
            status: connected ? 'connected' : 'error'
          }
        });
      }
    } catch (err) {
      console.error(`Failed to test ${service} connection:`, err);

      setSettings({
        ...settings,
        [service]: {
          ...settings[service],
          status: 'error'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 接続状態に基づいたステータス表示
  const renderStatus = (status) => {
    switch (status) {
      case 'connected':
        return <span className="status-connected">接続成功</span>;
      case 'error':
        return <span className="status-error">接続失敗</span>;
      default:
        return <span className="status-unknown">未確認</span>;
    }
  };

  return (
    <div className="settings-container">
      <h2>設定</h2>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {savedMessage && (
        <div className="success-message">{savedMessage}</div>
      )}

      <div className="settings-section">
        <h3>KoboldCPP API設定</h3>
        <p>テキスト生成AIとの接続設定</p>

        <div className="form-group">
          <label htmlFor="kobold-url">API URL:</label>
          <div className="input-with-button">
            <input
              type="text"
              id="kobold-url"
              name="url"
              value={settings.kobold.url}
              onChange={(e) => handleChange(e, 'kobold')}
              placeholder="http://localhost:5001"
              disabled={isLoading}
            />
            <button
              onClick={() => handleTestConnection('kobold')}
              disabled={isLoading || !settings.kobold.url}
            >
              テスト
            </button>
          </div>
        </div>

        <div className="connection-status">
          ステータス: {renderStatus(settings.kobold.status)}
        </div>
      </div>

      <div className="settings-section">
        <h3>Stable Diffusion API設定</h3>
        <p>画像生成AIとの接続設定</p>

        <div className="form-group">
          <label htmlFor="sd-url">API URL:</label>
          <div className="input-with-button">
            <input
              type="text"
              id="sd-url"
              name="url"
              value={settings.sd.url}
              onChange={(e) => handleChange(e, 'sd')}
              placeholder="http://localhost:7860"
              disabled={isLoading}
            />
            <button
              onClick={() => handleTestConnection('sd')}
              disabled={isLoading || !settings.sd.url}
            >
              テスト
            </button>
          </div>
        </div>

        <div className="connection-status">
          ステータス: {renderStatus(settings.sd.status)}
        </div>
      </div>

      <div className="settings-actions">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="save-button"
        >
          設定を保存
        </button>
      </div>
    </div>
  );
};

export default Settings;