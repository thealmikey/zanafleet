import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Role } from '../types';

// Mock users for each role
const mockUsers: Record<Role, User> = {
  ADMIN: {
    id: 'actor-admin-001',
    name: 'Sarah Admin',
    phone: '+254700000001',
    role: 'ADMIN',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    avatar: '👩‍💼',
    token: 'mock-admin-token',
  },
  OPS: {
    id: 'actor-ops-001',
    name: 'John Ops',
    phone: '+254700000002',
    role: 'OPS',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    avatar: '👨‍💻',
    token: 'mock-ops-token',
  },
  BUSINESS_OWNER: {
    id: 'actor-owner-001',
    name: 'Mike Business',
    phone: '+254700000003',
    role: 'BUSINESS_OWNER',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    avatar: '🏪',
    totalEarnings: 45000,
    token: 'mock-business-token',
  },
  RIDER: {
    id: 'actor-rider-001',
    name: 'Jane Rider',
    phone: '+254700000004',
    role: 'RIDER',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    avatar: '🏍️',
    totalEarnings: 12500,
    token: 'mock-rider-token',
  },
  CUSTOMER: {
    id: 'actor-customer-001',
    name: 'Alice Customer',
    phone: '+254700000005',
    role: 'CUSTOMER',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    avatar: '👤',
    token: 'mock-customer-token',
  },
};

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  workspaceId: string;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to ADMIN role for testing
  const [currentUser, setCurrentUser] = useState<User | null>(mockUsers.ADMIN);
  const [workspaceId, setWorkspaceId] = useState('00000000-0000-0000-0000-000000000001');
  const [token, setToken] = useState<string | null>(mockUsers.ADMIN.token || null);

  const login = async (_phone: string, _password: string) => {
    // In sandbox mode, just use the ADMIN user
    setCurrentUser(mockUsers.ADMIN);
    setToken(mockUsers.ADMIN.token || null);
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
  };

  const switchRole = (role: Role) => {
    const newUser = mockUsers[role];
    setCurrentUser(newUser);
    setToken(newUser.token || null);
    setWorkspaceId(newUser.workspaceId);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!currentUser,
        currentUser,
        workspaceId,
        token,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
