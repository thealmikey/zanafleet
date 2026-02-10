import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/Layout';
import { getSettings, updateSettings, UserSettings, WorkingHours } from '../../services/settingsApi';
import { getHighestPriorityRole } from '../../utils/roleRouting';

export function SettingsPage(): React.ReactElement {
  const { user, token } = useAuth();

  const [availability, setAvailability] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({ start: '09:00', end: '17:00' });
  const [businessLocations, setBusinessLocations] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dashboardRole = getHighestPriorityRole(user?.roles);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const settings = await getSettings(token ?? undefined);
        if (!cancelled) {
          setAvailability(settings.availability);
          setWorkingHours(settings.workingHours);
          if (settings.businessLocations) {
            setBusinessLocations(settings.businessLocations);
          }
          if (settings.riderVehicleInfo) {
            setVehicleType(settings.riderVehicleInfo.type);
            setLicensePlate(settings.riderVehicleInfo.licensePlate);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load settings');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const update: Partial<UserSettings> = {
      availability,
      workingHours,
    };

    if (dashboardRole === 'business') {
      update.businessLocations = businessLocations;
    }

    if (dashboardRole === 'rider') {
      update.riderVehicleInfo = {
        type: vehicleType,
        licensePlate,
      };
    }

    try {
      const updated = await updateSettings(update, token ?? undefined);
      setAvailability(updated.availability);
      setWorkingHours(updated.workingHours);
      if (updated.businessLocations) {
        setBusinessLocations(updated.businessLocations);
      }
      if (updated.riderVehicleInfo) {
        setVehicleType(updated.riderVehicleInfo.type);
        setLicensePlate(updated.riderVehicleInfo.licensePlate);
      }
      setSuccess(true);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [availability, workingHours, businessLocations, vehicleType, licensePlate, dashboardRole, token]);

  const handleLocationChange = useCallback((index: number, value: string): void => {
    setBusinessLocations((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const handleAddLocation = useCallback((): void => {
    setBusinessLocations((prev) => [...prev, '']);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout title="Settings">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Settings
        </Typography>

        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Settings saved successfully
          </Alert>
        )}

        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Availability
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={availability}
                  onChange={(e) => setAvailability(e.target.checked)}
                  inputProps={{ 'aria-label': 'Toggle availability' }}
                />
              }
              label={availability ? 'Available' : 'Unavailable'}
            />
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Working Hours
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Time"
                type="time"
                value={workingHours.start}
                onChange={(e) => setWorkingHours((prev) => ({ ...prev, start: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Time"
                type="time"
                value={workingHours.end}
                onChange={(e) => setWorkingHours((prev) => ({ ...prev, end: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Box>

          {dashboardRole === 'business' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Business Locations
              </Typography>
              <Stack spacing={2}>
                {businessLocations.map((location, index) => (
                  <TextField
                    key={index}
                    label={`Location ${index + 1}`}
                    value={location}
                    onChange={(e) => handleLocationChange(index, e.target.value)}
                    fullWidth
                    size="small"
                  />
                ))}
                <Button variant="outlined" onClick={handleAddLocation} size="small">
                  Add Location
                </Button>
              </Stack>
            </Box>
          )}

          {dashboardRole === 'rider' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Vehicle Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Vehicle Type"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Motorcycle, Bicycle"
                />
                <TextField
                  label="License Plate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Stack>
            </Box>
          )}
        </Stack>

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </DashboardLayout>
  );
}
