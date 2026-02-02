import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { keycloakInstance } from '../config/keycloak.config';
import {
  login as apiLogin,
  logout as apiLogout,
  exchangeKeycloakToken,
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
  loginWithKeycloak: () => Promise<void>;
  initKeycloak: () => Promise<void>;
}

export type AuthContextValue = AuthState & AuthActions;

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } }
  | { type: 'KEYCLOAK_INIT_SUCCESS'; payload: boolean }
  | { type: 'KEYCLOAK_LOGIN_SUCCESS'; payload: { user: User; token: string } };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  keycloakInitialized: false,
  keycloakAuthenticated: false,
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
        keycloakAuthenticated: false,
        error: null,
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      };
    case 'KEYCLOAK_INIT_SUCCESS':
      return {
        ...state,
        keycloakInitialized: true,
        keycloakAuthenticated: action.payload,
      };
    case 'KEYCLOAK_LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        keycloakAuthenticated: true,
        error: null,
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
  const keycloakInitializedRef = useRef(false);

  const persistToken = useCallback((token: string | null): void => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const initKeycloak = useCallback(async (): Promise<void> => {
    if (keycloakInitializedRef.current) {
      return;
    }
    keycloakInitializedRef.current = true;

    try {
      const authenticated = await keycloakInstance.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false,
      });

      dispatch({ type: 'KEYCLOAK_INIT_SUCCESS', payload: authenticated });

      if (authenticated && keycloakInstance.token) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const response = await exchangeKeycloakToken(keycloakInstance.token);
          persistToken(response.token);
          dispatch({ type: 'KEYCLOAK_LOGIN_SUCCESS', payload: { user: response.user, token: response.token } });
        } catch (err) {
          console.error('Failed to exchange Keycloak token:', err);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to complete Keycloak authentication' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }

      keycloakInstance.onTokenExpired = (): void => {
        void keycloakInstance.updateToken(30).then((refreshed) => {
          if (refreshed && keycloakInstance.token) {
            void exchangeKeycloakToken(keycloakInstance.token).then((response) => {
              persistToken(response.token);
              dispatch({ type: 'KEYCLOAK_LOGIN_SUCCESS', payload: { user: response.user, token: response.token } });
            }).catch((err) => {
              console.error('Failed to refresh token:', err);
            });
          }
        }).catch(() => {
          console.error('Failed to refresh Keycloak token');
        });
      };
    } catch (err) {
      console.error('Keycloak initialization failed:', err);
      dispatch({ type: 'KEYCLOAK_INIT_SUCCESS', payload: false });
    }
  }, [persistToken]);

  const recoverSession = useCallback(async (): Promise<void> => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const user = await getCurrentUser(storedToken);
        dispatch({ type: 'RESTORE_SESSION', payload: { user, token: storedToken } });
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
        if (!(err instanceof ApiError && err.status === 401)) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to restore session' });
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      return;
    }

    await initKeycloak();
  }, [initKeycloak]);

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

      if (state.keycloakAuthenticated && keycloakInstance.authenticated) {
        void keycloakInstance.logout({ redirectUri: window.location.origin });
      }
    }
  }, [state.token, state.keycloakAuthenticated, persistToken]);

  const loginWithKeycloak = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      if (!state.keycloakInitialized) {
        await initKeycloak();
      }
      await keycloakInstance.login({ redirectUri: window.location.origin });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Keycloak login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  }, [state.keycloakInitialized, initKeycloak]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    clearError,
    loginWithKeycloak,
    initKeycloak,
  }), [state, login, logout, clearError, loginWithKeycloak, initKeycloak]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
