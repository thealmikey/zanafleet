import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import { HomePage } from './components/HomePage';
import { SignIn } from './components/SignIn';
import { Dashboard } from './components/Dashboard';
import { SignupWizard } from './components/SignupWizard';
import { ProtectedRoute } from './components/ProtectedRoute';

const theme = createTheme();

function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignupWizard />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
