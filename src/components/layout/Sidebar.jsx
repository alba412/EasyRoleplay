import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import './Sidebar.css';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { activeCharacter, activePersona } = useAppContext();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        <div className="sidebar-section">
          <h3>ナビゲーション</h3>
          <nav>
            <ul>
              <li className={location.pathname === '/' ? 'active' : ''}>
                <Link to="/">チャット</Link>
              </li>
              <li className={location.pathname === '/characters' ? 'active' : ''}>
                <Link to="/characters">キャラクター</Link>
              </li>
              <li className={location.pathname === '/personas' ? 'active' : ''}>
                <Link to="/personas">ペルソナ</Link>
              </li>
              <li className={location.pathname === '/settings' ? 'active' : ''}>
                <Link to="/settings">設定</Link>
              </li>
            </ul>
          </nav>
        </div>

        {isOpen && (
          <>
            <div className="sidebar-section">
              <h3>現在のキャラクター</h3>
              <div className="active-item">
                {activeCharacter ? (
                  <div className="character-info">
                    <img
                      src={activeCharacter.avatarPath || '/default-avatar.png'}
                      alt={activeCharacter.name}
                      className="avatar"
                    />
                    <span>{activeCharacter.name}</span>
                  </div>
                ) : (
                  <p>選択されていません</p>
                )}
              </div>
            </div>

            <div className="sidebar-section">
              <h3>現在のペルソナ</h3>
              <div className="active-item">
                {activePersona ? (
                  <div className="persona-info">
                    <img
                      src={activePersona.avatarPath || '/default-avatar.png'}
                      alt={activePersona.name}
                      className="avatar"
                    />
                    <span>{activePersona.name}</span>
                  </div>
                ) : (
                  <p>選択されていません</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;