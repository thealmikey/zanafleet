/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
}

/**
 * Authentication state for the auth context
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Request payload for login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response from login endpoint
 */
export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
}

/**
 * Request payload for Keycloak token exchange
 */
export interface KeycloakTokenExchangeRequest {
  accessToken: string;
}

/**
 * Authentication method type
 */
export interface AuthMethod {
  type: 'credentials' | 'keycloak';
}
