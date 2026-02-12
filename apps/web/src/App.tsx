import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import { SignupWizardProvider } from './contexts/SignupWizardContext';
import { DevAccountSwitcher } from './components/DevAccountSwitcher';
import { HomePage } from './components/HomePage';
import { SignIn } from './components/SignIn';
import { SignupWizard } from './components/SignupWizard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleDashboardRouter } from './components/Layout';
import { AdminDashboard } from './pages/AdminDashboard';
import { SupportDashboard } from './pages/SupportDashboard';
import { OperatorDashboard } from './pages/OperatorDashboard';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { RiderDashboard } from './pages/RiderDashboard';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';
import { MessagingPage } from './pages/Messaging';
import { AIAssistantPage } from './pages/AIAssistant';
import { HistoryCalendarPage } from './pages/HistoryCalendar';
import { ComponentsDemo } from './pages/Demo/ComponentsDemo';
import { RequestDeliveryPage } from './pages/RequestDelivery';
import { ShopPage } from './pages/Shop';
import { OrderTrackingPage } from './pages/OrderTracking';
import { ShopperDashboard } from './pages/ShopperDashboard';
import { SearchResultsPage } from './pages/Search/SearchResults';
import FleetDashboard from './pages/AssetPlatform/FleetDashboard';
import OperatorProfile from './pages/AssetPlatform/OperatorProfile';
import AssetMarketplace from './pages/AssetPlatform/AssetMarketplace';
import EventDashboard from './pages/EventDashboard';
import AssetManagement from './pages/AssetManagement';

const theme = createTheme();

function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SignupWizardProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignupWizard />} />
              <Route path="/demo/components" element={<ComponentsDemo />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai"
                element={
                  <ProtectedRoute>
                    <AIAssistantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryCalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleDashboardRouter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/*"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/support/*"
                element={
                  <ProtectedRoute>
                    <SupportDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/operator/*"
                element={
                  <ProtectedRoute>
                    <OperatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/business/*"
                element={
                  <ProtectedRoute>
                    <BusinessDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/rider/*"
                element={
                  <ProtectedRoute>
                    <RiderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/shopper/*"
                element={
                  <ProtectedRoute>
                    <ShopperDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delivery/request"
                element={
                  <ProtectedRoute>
                    <RequestDeliveryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop"
                element={
                  <ProtectedRoute>
                    <ShopPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order/:id/track"
                element={
                  <ProtectedRoute>
                    <OrderTrackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/fleet"
                element={
                  <ProtectedRoute>
                    <FleetDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/operator/:id"
                element={
                  <ProtectedRoute>
                    <OperatorProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/marketplace/assets"
                element={
                  <ProtectedRoute>
                    <AssetMarketplace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:bundleId"
                element={
                  <ProtectedRoute>
                    <EventDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assets"
                element={
                  <ProtectedRoute>
                    <AssetManagement />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </SignupWizardProvider>
        <DevAccountSwitcher />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
