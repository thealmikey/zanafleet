import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material';

import { useSignupWizard } from '../../../hooks/useSignupWizard';
import { ActorType } from '../../../types';

export function PersonalDetailsStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [touched, setTouched] = useState({
    fullName: false,
    nationalId: false,
    location: false,
    businessName: false,
    saccoName: false,
  });

  const validationErrors = useMemo(
    () => ({
      fullName:
        touched.fullName && formData.fullName.trim() === ''
          ? 'Full name is required'
          : null,
      nationalId:
        touched.nationalId && formData.nationalId.trim() === ''
          ? 'National ID is required'
          : null,
      location:
        touched.location && formData.location.trim() === ''
          ? 'Location is required'
          : null,
      businessName:
        formData.actorType === ActorType.Business ||
        formData.actorType === ActorType.BusinessOwner
          ? touched.businessName && formData.businessName.trim() === ''
            ? 'Business name is required'
            : null
          : null,
      saccoName: null,
    }),
    [formData, touched],
  );

  const handleFieldChange = useCallback(
    (field: 'fullName' | 'nationalId' | 'location' | 'businessName' | 'saccoName') =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value;
        updateField(field, value);
      },
    [updateField],
  );

  const handleFieldBlur = useCallback(
    (field: 'fullName' | 'nationalId' | 'location' | 'businessName' | 'saccoName') =>
      (): void => {
        setTouched((prev) => ({ ...prev, [field]: true }));
      },
    [],
  );

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Personal Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please provide your personal information to complete your registration.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Full Name */}
        <FormControl fullWidth required error={!!validationErrors.fullName}>
          <FormLabel sx={{ mb: 1 }}>
            Full Name <Typography component="span" color="error">*</Typography>
          </FormLabel>
          <TextField
            name="fullName"
            value={formData.fullName}
            onChange={handleFieldChange('fullName')}
            onBlur={handleFieldBlur('fullName')}
            placeholder="John Doe"
            disabled={isLoading}
            error={!!validationErrors.fullName}
            helperText={validationErrors.fullName}
            fullWidth
            variant="outlined"
            inputProps={{
              'aria-label': 'Full Name',
              'aria-required': true,
            }}
          />
        </FormControl>

        {/* National ID */}
        <FormControl fullWidth required error={!!validationErrors.nationalId}>
          <FormLabel sx={{ mb: 1 }}>
            National ID <Typography component="span" color="error">*</Typography>
          </FormLabel>
          <TextField
            name="nationalId"
            value={formData.nationalId}
            onChange={handleFieldChange('nationalId')}
            onBlur={handleFieldBlur('nationalId')}
            placeholder="12345678"
            disabled={isLoading}
            error={!!validationErrors.nationalId}
            helperText={validationErrors.nationalId}
            fullWidth
            variant="outlined"
            inputProps={{
              'aria-label': 'National ID',
              'aria-required': true,
            }}
          />
        </FormControl>

        {/* Location */}
        <FormControl fullWidth required error={!!validationErrors.location}>
          <FormLabel sx={{ mb: 1 }}>
            Location <Typography component="span" color="error">*</Typography>
          </FormLabel>
          <TextField
            name="location"
            value={formData.location}
            onChange={handleFieldChange('location')}
            onBlur={handleFieldBlur('location')}
            placeholder="Nairobi, Kenya"
            disabled={isLoading}
            error={!!validationErrors.location}
            helperText={validationErrors.location}
            fullWidth
            variant="outlined"
            inputProps={{
              'aria-label': 'Location',
              'aria-required': true,
            }}
          />
        </FormControl>

        {/* Business Name (conditional) */}
        {(formData.actorType === ActorType.Business ||
          formData.actorType === ActorType.BusinessOwner) && (
          <FormControl fullWidth required error={!!validationErrors.businessName}>
            <FormLabel sx={{ mb: 1 }}>
              Business Name{' '}
              <Typography component="span" color="error">
                *
              </Typography>
            </FormLabel>
            <TextField
              name="businessName"
              value={formData.businessName}
              onChange={handleFieldChange('businessName')}
              onBlur={handleFieldBlur('businessName')}
              placeholder="ABC Transporters"
              disabled={isLoading}
              error={!!validationErrors.businessName}
              helperText={validationErrors.businessName}
              fullWidth
              variant="outlined"
              inputProps={{
                'aria-label': 'Business Name',
                'aria-required': true,
              }}
            />
          </FormControl>
        )}

        {/* SACCO Name (conditional for Riders) */}
        {formData.actorType === ActorType.Rider && (
          <FormControl fullWidth error={!!validationErrors.saccoName}>
            <FormLabel sx={{ mb: 1 }}>SACCO Name</FormLabel>
            <TextField
              name="saccoName"
              value={formData.saccoName}
              onChange={handleFieldChange('saccoName')}
              onBlur={handleFieldBlur('saccoName')}
              placeholder="Enter your SACCO name"
              disabled={isLoading}
              error={!!validationErrors.saccoName}
              helperText="Enter the name of your SACCO (optional)"
              fullWidth
              variant="outlined"
              inputProps={{
                'aria-label': 'SACCO Name',
              }}
            />
          </FormControl>
        )}
      </Box>
    </Box>
  );
}
