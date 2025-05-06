import React, { createContext, useContext, useReducer, useEffect } from 'react';
import chatService from '../services/storage/chat';

const ChatContext = createContext();

const initialState = {
  sessions: [],
  activeSessionId: null,
  messages: [],
  isLoading: false,
  error: null
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSessionId: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // セッションのロード
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await chatService.getChatSessions();
        dispatch({ type: 'SET_SESSIONS', payload: sessions || [] });
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
      }
    };

    loadSessions();
  }, []);

  // アクティブセッションの設定時にメッセージをロード
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (!state.activeSessionId) {
        dispatch({ type: 'SET_MESSAGES', payload: [] });
        return;
      }

      try {
        const session = await chatService.getChatSession(state.activeSessionId);
        if (session) {
          dispatch({ type: 'SET_MESSAGES', payload: session.messages || [] });
        }
      } catch (error) {
        console.error('Failed to load session messages:', error);
      }
    };

    loadSessionMessages();
  }, [state.activeSessionId]);

  const value = {
    ...state,
    setSessions: (sessions) => {
      dispatch({ type: 'SET_SESSIONS', payload: sessions });
    },
    setActiveSession: (sessionId) => {
      dispatch({ type: 'SET_ACTIVE_SESSION', payload: sessionId });
    },
    setMessages: (messages) => {
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    },
    addMessage: (message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    },
    setLoading: (isLoading) => {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
    },
    setError: (error) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },
    // セッション管理関連の便利関数
    createSession: async (character, persona) => {
      if (!character || !persona) return null;

      try {
        const newSession = {
          id: null,
          characterId: character.id,
          personaId: persona.id,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const savedSession = await chatService.saveChatSession(newSession);
        dispatch({ type: 'SET_SESSIONS', payload: [...state.sessions, savedSession] });
        dispatch({ type: 'SET_ACTIVE_SESSION', payload: savedSession.id });
        return savedSession;
      } catch (error) {
        console.error('Failed to create session:', error);
        return null;
      }
    },
    deleteSession: async (sessionId) => {
      if (!sessionId) return false;

      try {
        await chatService.deleteChatSession(sessionId);
        const updatedSessions = state.sessions.filter(s => s.id !== sessionId);
        dispatch({ type: 'SET_SESSIONS', payload: updatedSessions });

        if (state.activeSessionId === sessionId) {
          dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
          dispatch({ type: 'SET_MESSAGES', payload: [] });
        }

        return true;
      } catch (error) {
        console.error('Failed to delete session:', error);
        return false;
      }
    }
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChatContext = () => useContext(ChatContext);