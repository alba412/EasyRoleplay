import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Chat from './pages/Chat';
import Characters from './pages/Characters';
import Personas from './pages/Personas';
import Settings from './pages/Settings';
import { AppProvider } from './context/AppContext';
import { ChatProvider } from './context/ChatContext';
import koboldAPI from './services/api/kobold';
import sdAPI from './services/api/sd';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // アプリ起動時に設定を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
          // KoboldCPP API URL
          if (settings.kobold && settings.kobold.url) {
            koboldAPI.updateBaseURL(settings.kobold.url);
          }

          // Stable Diffusion API URL
          if (settings.sd && settings.sd.url) {
            sdAPI.updateBaseURL(settings.sd.url);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadSettings();
  }, []);

  return (
    <AppProvider>
      <ChatProvider>
        <BrowserRouter>
          <div className="app">
            <Sidebar isOpen={sidebarOpen} />
            <div className="main-content">
              <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
              <div className="content-area">
                <Routes>
                  <Route path="/" element={<Chat />} />
                  <Route path="/characters" element={<Characters />} />
                  <Route path="/personas" element={<Personas />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </div>
          </div>
        </BrowserRouter>
      </ChatProvider>
    </AppProvider>
  );
}

export default App;