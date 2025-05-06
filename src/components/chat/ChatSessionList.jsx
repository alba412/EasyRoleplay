import React, { useState, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useAppContext } from '../../context/AppContext';
import chatService from '../../services/storage/chat';
import './ChatSessionList.css';

const ChatSessionList = () => {
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSession,
    deleteSession
  } = useChatContext();

  const { activeCharacter, activePersona } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // セッション一覧の取得
  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const result = await chatService.getChatSessions();
      setSessions(result || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
      setError('セッションの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 初期ロード
  useEffect(() => {
    fetchSessions();
  }, []);

  // 新しいセッションの作成
  const handleCreateSession = async () => {
    if (!activeCharacter || !activePersona) {
      setError('キャラクターとペルソナを選択してください');
      return;
    }

    try {
      const newSession = await chatService.saveChatSession({
        id: null,
        characterId: activeCharacter.id,
        personaId: activePersona.id,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (newSession && newSession.id) {
        await fetchSessions();
        setActiveSession(newSession.id);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('新しいセッションの作成に失敗しました');
    }
  };

  // セッションの切り替え
  const handleSelectSession = (sessionId) => {
    setActiveSession(sessionId);
  };

  // セッションの削除
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();

    if (!window.confirm('このセッションを削除しますか？')) return;

    try {
      await deleteSession(sessionId);
      setError(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('セッションの削除に失敗しました');
    }
  };

  // 日付のフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // キャラクター名の取得
  const getCharacterName = (characterId) => {
    if (characterId === activeCharacter?.id) {
      return activeCharacter.name;
    }
    return '不明なキャラクター';
  };

  // ペルソナ名の取得
  const getPersonaName = (personaId) => {
    if (personaId === activePersona?.id) {
      return activePersona.name;
    }
    return '不明なペルソナ';
  };

  return (
    <div className="chat-session-list">
      <div className="session-list-header">
        <h3>会話履歴</h3>
        <button onClick={handleCreateSession}>新しい会話</button>
      </div>

      {error && (
        <div className="session-error">{error}</div>
      )}

      {isLoading ? (
        <div className="loading-message">読み込み中...</div>
      ) : (
        <div className="sessions">
          {sessions.length === 0 ? (
            <div className="empty-message">会話履歴がありません</div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => handleSelectSession(session.id)}
              >
                <div className="session-info">
                  <div className="session-title">
                    {getCharacterName(session.characterId)} と {getPersonaName(session.personaId)}
                  </div>
                  <div className="session-date">
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ChatSessionList;