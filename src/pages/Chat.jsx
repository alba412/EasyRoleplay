import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useChatContext } from '../context/ChatContext';
import koboldAPI from '../services/api/kobold';
import promptBuilder from '../services/llm/promptBuilder';
import chatService from '../services/storage/chat';
import ChatSessionList from '../components/chat/ChatSessionList';
import ImageGenerator from '../components/imageGen/ImageGenerator';
import './Chat.css';

const Chat = () => {
  const { activeCharacter, activePersona } = useAppContext();
  const {
    messages,
    setMessages,
    addMessage,
    activeSessionId,
    setActiveSession,
    isLoading,
    setLoading,
    error,
    setError
  } = useChatContext();

  const [inputText, setInputText] = useState('');
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const messageEndRef = useRef(null);

  // メッセージ送信ハンドラー
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim() || !activeCharacter || !activePersona) return;
    if (isLoading) return;

    // ユーザーメッセージを追加
    const userMessage = {
      type: 'text',
      sender: 'user',
      content: inputText,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setInputText('');

    // セッション管理
    let sessionId = activeSessionId;
    if (!sessionId) {
      // 新しいセッションを作成
      const newSession = {
        id: null, // saveで自動生成される
        characterId: activeCharacter.id,
        personaId: activePersona.id,
        messages: [userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const savedSession = await chatService.saveChatSession(newSession);
        setActiveSession(savedSession.id);
        sessionId = savedSession.id;
      } catch (err) {
        console.error('Failed to create chat session:', err);
        setError('チャットセッションの作成に失敗しました');
      }
    } else {
      // 既存のセッションを更新
      try {
        const session = await chatService.getChatSession(sessionId);
        if (session) {
          session.messages = [...session.messages, userMessage];
          session.updatedAt = new Date().toISOString();
          await chatService.saveChatSession(session);
        }
      } catch (err) {
        console.error('Failed to update chat session:', err);
        setError('チャットセッションの更新に失敗しました');
      }
    }

    // AIの応答を生成
    generateAIResponse(sessionId);
  };

  // AI応答の生成
  const generateAIResponse = async (sessionId) => {
    if (!activeCharacter || !activePersona) return;

    setLoading(true);
    setError(null);

    try {
      // プロンプトの構築
      const prompt = promptBuilder.buildChatPrompt(activeCharacter, activePersona, messages);

      // LLM API呼び出し
      const aiResponse = await koboldAPI.generateText(prompt, {
        max_length: 300,
        temperature: 0.7,
        top_p: 0.9,
        stop_sequence: ['\n', `${activePersona.name}:`, `${activeCharacter.name}:`]
      });

      // 応答メッセージの作成
      const aiMessage = {
        type: 'text',
        sender: 'character',
        content: aiResponse.trim(),
        timestamp: new Date().toISOString()
      };

      // メッセージを追加
      addMessage(aiMessage);

      // セッションを更新
      if (sessionId) {
        try {
          const session = await chatService.getChatSession(sessionId);
          if (session) {
            session.messages = [...session.messages, aiMessage];
            session.updatedAt = new Date().toISOString();
            await chatService.saveChatSession(session);
          }
        } catch (err) {
          console.error('Failed to update chat session with AI response:', err);
        }
      }
    } catch (err) {
      console.error('Failed to generate AI response:', err);
      setError('AI応答の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 画像生成モーダル関連
  const handleOpenImageGen = () => {
    setIsImageGenOpen(true);
  };

  const handleCloseImageGen = () => {
    setIsImageGenOpen(false);
  };

  // メッセージ一覧の最下部へスクロール
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      {(!activeCharacter || !activePersona) ? (
        <div className="chat-placeholder">
          <p>キャラクターとペルソナを選択してください</p>
        </div>
      ) : (
        <>
          {/* チャットセッション一覧を追加 */}
          <ChatSessionList />

          <div className="chat-header">
            <div className="chat-participants">
              <div className="chat-participant character">
                <img
                  src={activeCharacter.avatarPath || '/images/default-avatar.png'}
                  alt={activeCharacter.name}
                  className="participant-avatar"
                />
                <span>{activeCharacter.name}</span>
              </div>

              <div className="chat-divider">
                <span>と</span>
              </div>

              <div className="chat-participant persona">
                <img
                  src={activePersona.avatarPath || '/images/default-avatar.png'}
                  alt={activePersona.name}
                  className="participant-avatar"
                />
                <span>{activePersona.name}</span>
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-start">
                <p>会話を始めましょう！</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.sender === 'user' ? 'user' : 'character'}`}
                >
                  {message.type === 'text' ? (
                    <div className="message-content">{message.content}</div>
                  ) : (
                    <img
                      src={message.content}
                      alt="Generated"
                      className="message-image"
                      onError={(e) => { e.target.src = '/images/image-error.png' }}
                    />
                  )}
                  <div className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="message character">
                <div className="message-loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="メッセージを入力..."
              rows="3"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <div className="chat-buttons">
              <button
                type="button"
                className="image-button"
                onClick={handleOpenImageGen}
                disabled={isLoading}
              >
                画像生成
              </button>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
              >
                送信
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}

          {/* 画像生成モーダル */}
          {isImageGenOpen && (
            <div className="modal-overlay">
              <div className="modal-container image-gen-modal">
                <ImageGenerator onClose={handleCloseImageGen} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Chat;