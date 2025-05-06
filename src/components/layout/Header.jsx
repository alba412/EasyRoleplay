import React from 'react';
import { useAppContext } from '../../context/AppContext';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const { theme, setTheme } = useAppContext();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          ☰
        </button>
        <h1>Easy RolePlay</h1>
      </div>
      <div className="header-right">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
};

export default Header;