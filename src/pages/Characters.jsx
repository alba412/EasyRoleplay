import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import characterService from '../services/storage/characters';
import CharacterEditor from '../components/character/CharacterEditor';
import './Characters.css';

const Characters = () => {
  const { activeCharacter, setActiveCharacter } = useAppContext();
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  // キャラクター一覧の取得
  const loadCharacters = async () => {
    setIsLoading(true);
    try {
      const result = await characterService.getCharacters();
      setCharacters(result || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load characters:', err);
      setError('キャラクターの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  // 新規キャラクター作成
  const handleCreateCharacter = () => {
    setEditingCharacter({
      id: null,
      name: '',
      description: '',
      avatarPath: '',
      imageGenerationPrompt: ''
    });
    setIsModalOpen(true);
  };

  // キャラクターの編集
  const handleEditCharacter = (character) => {
    setEditingCharacter({ ...character });
    setIsModalOpen(true);
  };

  // キャラクターの保存
  const handleSaveCharacter = async (character) => {
    try {
      const savedCharacter = await characterService.saveCharacter(character);
      setIsModalOpen(false);
      await loadCharacters(); // キャラクターリストを更新
      setError(null);

      // 作成または編集したキャラクターを自動的にアクティブに設定
      if (savedCharacter) {
        setActiveCharacter(savedCharacter);
      }
    } catch (err) {
      console.error('Failed to save character:', err);
      setError('キャラクターの保存に失敗しました');
    }
  };

  // キャラクターの選択
  const handleSelectCharacter = (character) => {
    setActiveCharacter(character);
  };

  // キャラクターの削除
  const handleDeleteCharacter = async (id) => {
    if (!window.confirm('このキャラクターを削除しますか？')) return;

    try {
      await characterService.deleteCharacter(id);

      // アクティブなキャラクターが削除された場合はnullに
      if (activeCharacter && activeCharacter.id === id) {
        setActiveCharacter(null);
      }

      await loadCharacters(); // リストを更新
      setError(null);
    } catch (err) {
      console.error('Failed to delete character:', err);
      setError('キャラクターの削除に失敗しました');
    }
  };

  return (
    <div className="characters-container">
      <div className="characters-header">
        <h2>キャラクター管理</h2>
        <button onClick={handleCreateCharacter}>新規作成</button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {isLoading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <div className="character-list">
          {characters.length === 0 ? (
            <div className="empty-message">
              キャラクターがありません。新しいキャラクターを作成してください。
            </div>
          ) : (
            characters.map(character => (
              <div
                key={character.id}
                className={`character-card ${activeCharacter?.id === character.id ? 'active' : ''}`}
                onClick={() => handleSelectCharacter(character)}
              >
                <div className="character-image">
                  <img
                    src={character.avatarPath || '/default-avatar.png'}
                    alt={character.name}
                    onError={(e) => { e.target.src = '/default-avatar.png' }}
                  />
                </div>
                <div className="character-info">
                  <h3>{character.name}</h3>
                  <p>{character.description.substring(0, 100)}...</p>
                </div>
                <div className="character-actions">
                  <button
                    className="edit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCharacter(character);
                    }}
                  >
                    編集
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCharacter(character.id);
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

      {/* キャラクター編集モーダル */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <CharacterEditor
              character={editingCharacter}
              onSave={handleSaveCharacter}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Characters;