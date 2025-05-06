import React, { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

const initialState = {
  activeCharacter: null,
  activePersona: null,
  theme: 'light'
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_CHARACTER':
      return { ...state, activeCharacter: action.payload };
    case 'SET_ACTIVE_PERSONA':
      return { ...state, activePersona: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = {
    ...state,
    setActiveCharacter: (character) => {
      dispatch({ type: 'SET_ACTIVE_CHARACTER', payload: character });
    },
    setActivePersona: (persona) => {
      dispatch({ type: 'SET_ACTIVE_PERSONA', payload: persona });
    },
    setTheme: (theme) => {
      dispatch({ type: 'SET_THEME', payload: theme });
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);