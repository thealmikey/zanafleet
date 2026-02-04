import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';

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
    email: false,
    phone: false,
    password: false,
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
      email:
        touched.email && formData.email.trim() === ''
          ? 'Email is required'
          : null,
      phone:
        touched.phone && formData.phone.trim() === ''
          ? 'Phone number is required'
          : null,
      password:
        touched.password && formData.password.trim() === ''
          ? 'Password is required'
          : null,
    }),
    [formData, touched],
  );

  const handleFieldChange = useCallback(
    (field: 'fullName' | 'nationalId' | 'location' | 'businessName' | 'saccoName' | 'email' | 'phone' | 'password') =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value;
        updateField(field, value);
      },
    [updateField],
  );

  const handleFieldBlur = useCallback(
    (field: 'fullName' | 'nationalId' | 'location' | 'businessName' | 'saccoName' | 'email' | 'phone' | 'password') =>
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

        {/* Email */}
        <FormControl fullWidth required error={!!validationErrors.email}>
          <FormLabel sx={{ mb: 1 }}>
            Email <Typography component="span" color="error">*</Typography>
          </FormLabel>
          <TextField
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFieldChange('email')}
            onBlur={handleFieldBlur('email')}
            placeholder="rider@example.com"
            disabled={isLoading}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
            inputProps={{
              'aria-label': 'Email',
              'aria-required': true,
            }}
          />
        </FormControl>

        {/* Phone */}
        <FormControl fullWidth required error={!!validationErrors.phone}>
          <FormLabel sx={{ mb: 1 }}>
            Phone Number <Typography component="span" color="error">*</Typography>
          </FormLabel>
          <TextField
            name="phone"
            value={formData.phone}
            onChange={handleFieldChange('phone')}
            onBlur={handleFieldBlur('phone')}
            placeholder="+254 712 345 678"
            disabled={isLoading}
            error={!!validationErrors.phone}
            helperText={validationErrors.phone}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
            inputProps={{
              'aria-label': 'Phone Number',
              'aria-required': true,
            }}
          />
        </FormControl>

        {/* Password */}
        <FormControl fullWidth required error={!!validationErrors.password}>
          <FormLabel sx={{ mb: 1 }}>
            Password <Typography component="span" color="error">*</Typography>
          </FormLabel>
          <TextField
            name="password"
            type="password"
            value={formData.password}
            onChange={handleFieldChange('password')}
            onBlur={handleFieldBlur('password')}
            placeholder="Enter a secure password"
            disabled={isLoading}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: <LockIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
            inputProps={{
              'aria-label': 'Password',
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
