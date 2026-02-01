import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
} from '../services/authApi';
import { ApiError } from '../services/signupApi';
import {
  AuthState,
  LoginRequest,
  User,
} from '../types';

const STORAGE_KEY = 'zanafleet_auth_token';

export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export type AuthContextValue = AuthState & AuthActions;

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      };
    default:
      return state;
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);

  const persistToken = useCallback((token: string | null): void => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const recoverSession = useCallback(async (): Promise<void> => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (!storedToken) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const user = await getCurrentUser(storedToken);
      dispatch({ type: 'RESTORE_SESSION', payload: { user, token: storedToken } });
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore session' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    void recoverSession();
  }, [recoverSession]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await apiLogin(credentials);
      persistToken(response.token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.user, token: response.token } });
    } catch (err) {
      const message = err instanceof ApiError
        ? `Login failed: ${err.statusText}`
        : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [persistToken]);

  const logout = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      await apiLogout(state.token ?? undefined);
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      persistToken(null);
      dispatch({ type: 'LOGOUT' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.token, persistToken]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    clearError,
  }), [state, login, logout, clearError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
