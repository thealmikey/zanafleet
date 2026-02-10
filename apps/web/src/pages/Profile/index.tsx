import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { PhotoCamera as PhotoCameraIcon, Save as SaveIcon } from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/Layout';
import { getProfile, updateProfile } from '../../services/authApi';
import { getSettings, updateSettings } from '../../services/settingsApi';
import { createMediaAsset, getSignedUrl, uploadToSignedUrl } from '../../services/mediaApi';

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
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const [profile, settings] = await Promise.all([
          getProfile(token ?? undefined),
          getSettings(token ?? undefined),
        ]);
        if (!cancelled) {
          setName(profile.name);
          setEmail(profile.email);
          if (settings.profileImage?.url) {
            setProfileImageUrl(settings.profileImage.url);
          }
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

  const handlePhotoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploadingPhoto(true);
      setError(null);
      setSuccess(false);

      try {
        const asset = await createMediaAsset(
          {
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            ownerId: user?.id ?? 'unknown',
            ownerType: 'Rider',
          },
          token ?? undefined
        );

        const signedUrlResp = await getSignedUrl(
          asset.mediaAssetId,
          'PUT',
          { contentType: file.type },
          token ?? undefined
        );

        await uploadToSignedUrl(signedUrlResp.url, file, file.type);

        const newImageUrl = signedUrlResp.url.split('?')[0];

        await updateSettings(
          { profileImage: { mediaAssetId: asset.mediaAssetId, url: newImageUrl } },
          token ?? undefined
        );

        setProfileImageUrl(newImageUrl);
        setSuccess(true);
      } catch (err) {
        setError('Failed to upload photo');
      } finally {
        setIsUploadingPhoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [user?.id, token]
  );

  const handleChangePhotoClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

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
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={profileImageUrl ?? undefined}
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: '2rem',
              }}
            >
              {getInitials(name || 'U')}
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-label="Upload profile photo"
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleChangePhotoClick}
              disabled={isUploadingPhoto}
              startIcon={
                isUploadingPhoto ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <PhotoCameraIcon fontSize="small" />
                )
              }
              sx={{ mt: 1, fontSize: '0.75rem' }}
            >
              {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </Button>
          </Box>
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
