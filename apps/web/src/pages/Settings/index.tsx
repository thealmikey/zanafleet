import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddPhotoAlternate as AddPhotoIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/Layout';
import {
  DocumentsInfo,
  getSettings,
  MediaReference,
  updateSettings,
  UserSettings,
  VehicleInfo,
  VehiclePhoto,
  WorkingHours,
} from '../../services/settingsApi';
import { createMediaAsset, getSignedUrl, uploadToSignedUrl } from '../../services/mediaApi';
import { getHighestPriorityRole } from '../../utils/roleRouting';

export function SettingsPage(): React.ReactElement {
  const { user, token } = useAuth();

  const [availability, setAvailability] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({ start: '09:00', end: '17:00' });
  const [businessLocations, setBusinessLocations] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const [vehicle, setVehicle] = useState<VehicleInfo>({
    type: '',
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    photos: [],
  });
  const [documents, setDocuments] = useState<DocumentsInfo>({
    nationalId: undefined,
    driversLicense: undefined,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingVehiclePhoto, setIsUploadingVehiclePhoto] = useState(false);
  const [isUploadingNationalId, setIsUploadingNationalId] = useState(false);
  const [isUploadingDriversLicense, setIsUploadingDriversLicense] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const vehiclePhotoInputRef = useRef<HTMLInputElement>(null);
  const nationalIdInputRef = useRef<HTMLInputElement>(null);
  const driversLicenseInputRef = useRef<HTMLInputElement>(null);

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
          if (settings.vehicle) {
            setVehicle({
              type: settings.vehicle.type || '',
              make: settings.vehicle.make || '',
              model: settings.vehicle.model || '',
              year: settings.vehicle.year || '',
              color: settings.vehicle.color || '',
              licensePlate: settings.vehicle.licensePlate || '',
              photos: settings.vehicle.photos || [],
            });
          }
          if (settings.documents) {
            setDocuments({
              nationalId: settings.documents.nationalId,
              driversLicense: settings.documents.driversLicense,
            });
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
      vehicle,
      documents,
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
      if (updated.vehicle) {
        setVehicle({
          type: updated.vehicle.type || '',
          make: updated.vehicle.make || '',
          model: updated.vehicle.model || '',
          year: updated.vehicle.year || '',
          color: updated.vehicle.color || '',
          licensePlate: updated.vehicle.licensePlate || '',
          photos: updated.vehicle.photos || [],
        });
      }
      if (updated.documents) {
        setDocuments({
          nationalId: updated.documents.nationalId,
          driversLicense: updated.documents.driversLicense,
        });
      }
      setSuccess(true);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [availability, workingHours, businessLocations, vehicleType, licensePlate, vehicle, documents, dashboardRole, token]);

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

  const handleVehicleFieldChange = useCallback(
    (field: keyof VehicleInfo) =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        setVehicle((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  const uploadFile = useCallback(
    async (file: File): Promise<MediaReference> => {
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

      const url = signedUrlResp.url.split('?')[0];
      return { mediaAssetId: asset.mediaAssetId, url };
    },
    [user?.id, token]
  );

  const handleVehiclePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploadingVehiclePhoto(true);
      setError(null);
      setSuccess(false);

      try {
        const ref = await uploadFile(file);
        const newPhoto: VehiclePhoto = { mediaAssetId: ref.mediaAssetId, url: ref.url };
        const updatedPhotos = [...(vehicle.photos || []), newPhoto];

        const updatedVehicle = { ...vehicle, photos: updatedPhotos };
        setVehicle(updatedVehicle);

        await updateSettings({ vehicle: updatedVehicle }, token ?? undefined);
        setSuccess(true);
      } catch (err) {
        setError('Failed to upload vehicle photo');
      } finally {
        setIsUploadingVehiclePhoto(false);
        if (vehiclePhotoInputRef.current) {
          vehiclePhotoInputRef.current.value = '';
        }
      }
    },
    [vehicle, uploadFile, token]
  );

  const handleRemoveVehiclePhoto = useCallback(
    async (index: number): Promise<void> => {
      const updatedPhotos = (vehicle.photos || []).filter((_, i) => i !== index);
      const updatedVehicle = { ...vehicle, photos: updatedPhotos };
      setVehicle(updatedVehicle);

      try {
        await updateSettings({ vehicle: updatedVehicle }, token ?? undefined);
      } catch (err) {
        setError('Failed to remove photo');
      }
    },
    [vehicle, token]
  );

  const handleDocumentUpload = useCallback(
    (docType: 'nationalId' | 'driversLicense') =>
      async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        const setUploading =
          docType === 'nationalId' ? setIsUploadingNationalId : setIsUploadingDriversLicense;
        const inputRef = docType === 'nationalId' ? nationalIdInputRef : driversLicenseInputRef;

        setUploading(true);
        setError(null);
        setSuccess(false);

        try {
          const ref = await uploadFile(file);
          const updatedDocs = { ...documents, [docType]: ref };
          setDocuments(updatedDocs);

          await updateSettings({ documents: updatedDocs }, token ?? undefined);
          setSuccess(true);
        } catch (err) {
          setError(`Failed to upload ${docType === 'nationalId' ? 'National ID' : "Driver's License"}`);
        } finally {
          setUploading(false);
          if (inputRef.current) {
            inputRef.current.value = '';
          }
        }
      },
    [documents, uploadFile, token]
  );

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

          <Box>
            <Typography variant="h6" gutterBottom>
              Vehicle
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Type"
                  value={vehicle.type}
                  onChange={handleVehicleFieldChange('type')}
                  size="small"
                  placeholder="e.g., Motorcycle"
                />
                <TextField
                  label="Make"
                  value={vehicle.make}
                  onChange={handleVehicleFieldChange('make')}
                  size="small"
                  placeholder="e.g., Honda"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Model"
                  value={vehicle.model}
                  onChange={handleVehicleFieldChange('model')}
                  size="small"
                  placeholder="e.g., CB500"
                />
                <TextField
                  label="Year"
                  value={vehicle.year}
                  onChange={handleVehicleFieldChange('year')}
                  size="small"
                  placeholder="e.g., 2022"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Color"
                  value={vehicle.color}
                  onChange={handleVehicleFieldChange('color')}
                  size="small"
                  placeholder="e.g., Red"
                />
                <TextField
                  label="License Plate"
                  value={vehicle.licensePlate}
                  onChange={handleVehicleFieldChange('licensePlate')}
                  size="small"
                  placeholder="e.g., KAA 123B"
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Vehicle Photos
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {(vehicle.photos || []).map((photo, index) => (
                    <Box
                      key={photo.mediaAssetId || index}
                      sx={{
                        position: 'relative',
                        width: 80,
                        height: 80,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        component="img"
                        src={photo.url}
                        alt={`Vehicle photo ${index + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => void handleRemoveVehiclePhoto(index)}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
                <input
                  ref={vehiclePhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleVehiclePhotoUpload(e)}
                  style={{ display: 'none' }}
                  aria-label="Upload vehicle photo"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => vehiclePhotoInputRef.current?.click()}
                  disabled={isUploadingVehiclePhoto}
                  startIcon={
                    isUploadingVehiclePhoto ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <AddPhotoIcon />
                    )
                  }
                >
                  {isUploadingVehiclePhoto ? 'Uploading...' : 'Add Photo'}
                </Button>
              </Box>
            </Stack>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Documents
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  National ID
                </Typography>
                {documents.nationalId?.url ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      Uploaded
                    </Typography>
                    <Button
                      size="small"
                      href={documents.nationalId.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Button>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not uploaded
                  </Typography>
                )}
                <input
                  ref={nationalIdInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('nationalId')}
                  style={{ display: 'none' }}
                  aria-label="Upload National ID"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => nationalIdInputRef.current?.click()}
                  disabled={isUploadingNationalId}
                  startIcon={
                    isUploadingNationalId ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <UploadIcon />
                    )
                  }
                  sx={{ mt: 1 }}
                >
                  {isUploadingNationalId ? 'Uploading...' : 'Upload National ID'}
                </Button>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Driver's License
                </Typography>
                {documents.driversLicense?.url ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      Uploaded
                    </Typography>
                    <Button
                      size="small"
                      href={documents.driversLicense.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Button>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not uploaded
                  </Typography>
                )}
                <input
                  ref={driversLicenseInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('driversLicense')}
                  style={{ display: 'none' }}
                  aria-label="Upload Driver's License"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => driversLicenseInputRef.current?.click()}
                  disabled={isUploadingDriversLicense}
                  startIcon={
                    isUploadingDriversLicense ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <UploadIcon />
                    )
                  }
                  sx={{ mt: 1 }}
                >
                  {isUploadingDriversLicense ? 'Uploading...' : "Upload Driver's License"}
                </Button>
              </Box>
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
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </DashboardLayout>
  );
}
