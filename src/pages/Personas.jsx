import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import personaService from '../services/storage/personas';
import PersonaEditor from '../components/persona/PersonaEditor';
import './Personas.css';

const Personas = () => {
  const { activePersona, setActivePersona } = useAppContext();
  const [personas, setPersonas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPersona, setEditingPersona] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  // ペルソナ一覧の取得
  const loadPersonas = async () => {
    setIsLoading(true);
    try {
      const result = await personaService.getPersonas();
      setPersonas(result || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load personas:', err);
      setError('ペルソナの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  // 新規ペルソナ作成
  const handleCreatePersona = () => {
    setEditingPersona({
      id: null,
      name: '',
      description: '',
      avatarPath: ''
    });
    setIsModalOpen(true);
  };

  // ペルソナの編集
  const handleEditPersona = (persona) => {
    setEditingPersona({ ...persona });
    setIsModalOpen(true);
  };

  // ペルソナの保存
  const handleSavePersona = async (persona) => {
    try {
      const savedPersona = await personaService.savePersona(persona);
      setIsModalOpen(false);
      await loadPersonas(); // ペルソナリストを更新
      setError(null);

      // 作成または編集したペルソナを自動的にアクティブに設定
      if (savedPersona) {
        setActivePersona(savedPersona);
      }
    } catch (err) {
      console.error('Failed to save persona:', err);
      setError('ペルソナの保存に失敗しました');
    }
  };

  // ペルソナの選択
  const handleSelectPersona = (persona) => {
    setActivePersona(persona);
  };

  // ペルソナの削除
  const handleDeletePersona = async (id) => {
    if (!window.confirm('このペルソナを削除しますか？')) return;

    try {
      await personaService.deletePersona(id);

      // アクティブなペルソナが削除された場合はnullに
      if (activePersona && activePersona.id === id) {
        setActivePersona(null);
      }

      await loadPersonas(); // リストを更新
      setError(null);
    } catch (err) {
      console.error('Failed to delete persona:', err);
      setError('ペルソナの削除に失敗しました');
    }
  };

  return (
    <div className="personas-container">
      <div className="personas-header">
        <h2>ペルソナ管理</h2>
        <button onClick={handleCreatePersona}>新規作成</button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {isLoading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <div className="persona-list">
          {personas.length === 0 ? (
            <div className="empty-message">
              ペルソナがありません。新しいペルソナを作成してください。
            </div>
          ) : (
            personas.map(persona => (
              <div
                key={persona.id}
                className={`persona-card ${activePersona?.id === persona.id ? 'active' : ''}`}
                onClick={() => handleSelectPersona(persona)}
              >
                <div className="persona-image">
                  <img
                    src={persona.avatarPath || '/images/default-avatar.png'}
                    alt={persona.name}
                    onError={(e) => { e.target.src = '/images/default-avatar.png' }}
                  />
                </div>
                <div className="persona-info">
                  <h3>{persona.name}</h3>
                  <p>{persona.description.substring(0, 100)}...</p>
                </div>
                <div className="persona-actions">
                  <button
                    className="edit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditPersona(persona);
                    }}
                  >
                    編集
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePersona(persona.id);
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ペルソナ編集モーダル */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <PersonaEditor
              persona={editingPersona}
              onSave={handleSavePersona}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Personas;