import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/Layout';
import { getProfile, updateProfile } from '../../services/authApi';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfilePage(): React.ReactElement {
  const { user, token, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const profile = await getProfile(token ?? undefined);
        if (!cancelled) {
          setName(profile.name);
          setEmail(profile.email);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load profile');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateProfile({ name, email }, token ?? undefined);
      updateUser(updated);
      setSuccess(true);
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [name, email, token, updateUser]);

  if (isLoading) {
    return (
      <DashboardLayout title="Profile">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile">
      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              fontSize: '2rem',
            }}
          >
            {getInitials(name || 'U')}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h1">
              {name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Profile updated successfully
          </Alert>
        )}

        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              User ID
            </Typography>
            <Typography variant="body1">{user?.id ?? '—'}</Typography>
          </Box>

          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
          />

          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            type="email"
          />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Roles
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Chip key={role} label={role} size="small" color="primary" variant="outlined" />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No roles assigned
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Paper>
    </DashboardLayout>
  );
}
