import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleSwitcher from './components/RoleSwitcher';
import ApiDebugPanel from './components/ApiDebugPanel';
import { BillingPage } from './pages/Billing';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import Homepage from './pages/Homepage';
import JobFeed from './pages/JobFeed';
import { MapsPage } from './pages/Maps';
import Reports from './pages/Reports';
import { WalletPage } from './pages/Wallet';
import { BusinessOnboarding } from './pages/business';
import { RiderManagement } from './pages/rider';
import OrderCreation from './pages/OrderCreation';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const DashboardWrapper: React.FC = () => {
  const { currentUser, logout, switchRole } = useAuth();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar with role switcher */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#1a1a2e',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#00d9ff' }}>🚚 ZanaFleet</h1>
          <span style={{ color: '#888', fontSize: '14px' }}>|</span>
          <span style={{ fontSize: '14px', color: '#aaa' }}>
            {currentUser?.workspaceId.slice(0, 8)}...
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <RoleSwitcher currentUser={currentUser} onRoleSwitch={switchRole} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{currentUser?.avatar}</span>
            <span style={{ fontWeight: 500 }}>{currentUser?.name}</span>
          </div>
          <button 
            onClick={logout}
            style={{
              backgroundColor: '#e94560',
              border: 'none',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>
      
      {/* Dashboard content */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Dashboard />
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      
      {/* Role-based dashboard redirect */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobFeed />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/maps"
        element={
          <ProtectedRoute>
            <MapsPage />
          </ProtectedRoute>
        }
      />
      
      {/* New Flow Pages */}
      <Route
        path="/business/onboard"
        element={
          <ProtectedRoute>
            <BusinessOnboarding />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/rider/register"
        element={
          <ProtectedRoute>
            <RiderManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/order/create"
        element={
          <ProtectedRoute>
            <OrderCreation />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ApiDebugPanel />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
