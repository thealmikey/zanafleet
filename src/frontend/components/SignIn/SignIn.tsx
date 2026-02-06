import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

interface FormErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

export function SignIn(): React.ReactElement {
  const navigate = useNavigate();
  const { login, loginWithKeycloak, isLoading, error, clearError, keycloakInitialized } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [keycloakLoading, setKeycloakLoading] = useState(false);

  const validateForm = useCallback((): boolean => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setFormErrors({
      email: emailError,
      password: passwordError,
    });

    return !emailError && !passwordError;
  }, [email, password]);

  const handleEmailChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setEmail(value);
      if (touched.email) {
        setFormErrors((prev) => ({ ...prev, email: validateEmail(value) }));
      }
      if (error) {
        clearError();
      }
    },
    [touched.email, error, clearError],
  );

  const handlePasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setPassword(value);
      if (touched.password) {
        setFormErrors((prev) => ({ ...prev, password: validatePassword(value) }));
      }
      if (error) {
        clearError();
      }
    },
    [touched.password, error, clearError],
  );

  const handleEmailBlur = useCallback((): void => {
    setTouched((prev) => ({ ...prev, email: true }));
    setFormErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  }, [email]);

  const handlePasswordBlur = useCallback((): void => {
    setTouched((prev) => ({ ...prev, password: true }));
    setFormErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  }, [password]);

  const handleKeycloakLogin = useCallback(async () => {
    setKeycloakLoading(true);
    try {
      await loginWithKeycloak();
    } catch {
      // Keycloak will redirect, errors handled by AuthContext
    }
    // Note: page will redirect, so loading state may not matter
  }, [loginWithKeycloak]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      setTouched({ email: true, password: true });

      if (!validateForm()) {
        return;
      }

      try {
        await login({ email, password });
        navigate('/dashboard');
      } catch {
        // Error is handled by AuthContext and displayed via the error state
      }
    },
    [email, password, validateForm, login, navigate],
  );

  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 450 },
        mx: 'auto',
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 3, textAlign: 'center', fontWeight: 500 }}
      >
        Sign In
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          required
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={touched.email && Boolean(formErrors.email)}
          helperText={touched.email && formErrors.email}
          disabled={isLoading}
          sx={{ mb: 2 }}
        />

        <TextField
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          fullWidth
          required
          value={password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={touched.password && Boolean(formErrors.password)}
          helperText={touched.password && formErrors.password}
          disabled={isLoading}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
          sx={{ mb: 2, py: 1.5 }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sign In'
          )}
        </Button>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">OR</Typography>
        </Divider>

        <Button
          variant="outlined"
          fullWidth
          onClick={handleKeycloakLogin}
          disabled={isLoading || keycloakLoading || !keycloakInitialized}
          sx={{ py: 1.5, mb: 2 }}
        >
          {keycloakLoading ? (
            <CircularProgress size={24} />
          ) : (
            'Login with Keycloak SSO'
          )}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {"Don't have an account? "}
            <MuiLink component={RouterLink} to="/signup" underline="hover">
              Sign up
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
