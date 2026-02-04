import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';

import { useSignupWizard } from '../../../hooks/useSignupWizard';
import { ActorType, FinalizeSignupResponse } from '../../../types';

interface FieldSummary {
  label: string;
  value: string | null;
  isFilled: boolean;
  isRequired: boolean;
  icon: React.ReactNode;
}

export interface ReviewStepProps {
  onComplete?: (result: FinalizeSignupResponse) => void;
}

export function ReviewStep({ onComplete }: ReviewStepProps): React.ReactElement {
  const { formData, finalize, isLoading, error } = useSignupWizard();
  const [finalizeResult, setFinalizeResult] = useState<FinalizeSignupResponse | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const fieldSummaries: FieldSummary[] = [
    {
      label: 'Account Type',
      value: formData.actorType,
      isFilled: formData.actorType !== null,
      isRequired: true,
      icon: <AccountCircleIcon />,
    },
    {
      label: 'Full Name',
      value: formData.fullName || null,
      isFilled: formData.fullName.trim() !== '',
      isRequired: true,
      icon: <PersonIcon />,
    },
    {
      label: 'National ID',
      value: formData.nationalId || null,
      isFilled: formData.nationalId.trim() !== '',
      isRequired: true,
      icon: <BadgeIcon />,
    },
    {
      label: 'Location',
      value: formData.location || null,
      isFilled: formData.location.trim() !== '',
      isRequired: true,
      icon: <LocationOnIcon />,
    },
  ];

  // Add conditional fields
  if (formData.actorType === ActorType.Business || formData.actorType === ActorType.BusinessOwner) {
    fieldSummaries.push({
      label: 'Business Name',
      value: formData.businessName || null,
      isFilled: formData.businessName.trim() !== '',
      isRequired: true,
      icon: <BusinessIcon />,
    });
  }

  if (formData.actorType === ActorType.Rider) {
    fieldSummaries.push({
      label: 'SACCO Name',
      value: formData.saccoName || null,
      isFilled: formData.saccoName.trim() !== '',
      isRequired: false,
      icon: <GroupsIcon />,
    });
  }

  const missingRequired = fieldSummaries.filter(
    (field) => field.isRequired && !field.isFilled,
  );

  const canFinalize = missingRequired.length === 0;

  const handleFinalize = useCallback(async (): Promise<void> => {
    setLocalError(null);
    try {
      const result = await finalize();
      setFinalizeResult(result);
      onComplete?.(result);
    } catch (err) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('An unexpected error occurred');
      }
    }
  }, [finalize, onComplete]);

  if (finalizeResult) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ mb: 3 }}
        >
          Account created successfully!
        </Alert>

        <Paper
          variant="outlined"
          sx={{
            p: 3,
            bgcolor: 'success.light',
            borderColor: 'success.main',
          }}
        >
          <Typography variant="h6" gutterBottom color="success.dark">
            Your Account Details
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Actor ID
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {finalizeResult.actorId}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Workspace ID
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {finalizeResult.workspaceId}
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  const displayError = localError || error;

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Review & Confirm
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your selections before finalizing your account.
      </Typography>

      {displayError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {displayError}
        </Alert>
      )}

      {missingRequired.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please complete the following required fields before finalizing:
          <Box component="ul" sx={{ mb: 0, pl: 2 }}>
            {missingRequired.map((field) => (
              <li key={field.label}>{field.label}</li>
            ))}
          </Box>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <List disablePadding>
          {fieldSummaries.map((field, index) => (
            <React.Fragment key={field.label}>
              {index > 0 && <Divider />}
              <ListItem
                sx={{
                  bgcolor:
                    field.isRequired && !field.isFilled
                      ? 'warning.light'
                      : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{field.icon}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {field.label}
                      {field.isRequired && (
                        <Chip
                          label="Required"
                          size="small"
                          color={field.isFilled ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    field.isFilled ? (
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          wordBreak: 'break-all',
                          fontFamily:
                            field.label === 'Workspace ID' ? 'monospace' : 'inherit',
                        }}
                      >
                        {field.value}
                      </Typography>
                    ) : (
                      <Typography
                        component="span"
                        variant="body2"
                        color={field.isRequired ? 'warning.dark' : 'text.secondary'}
                        sx={{ fontStyle: 'italic' }}
                      >
                        {field.isRequired ? 'Not set (required)' : 'Not set'}
                      </Typography>
                    )
                  }
                />
                {field.isFilled ? (
                  <CheckCircleIcon color="success" />
                ) : field.isRequired ? (
                  <WarningIcon color="warning" />
                ) : null}
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Button
        variant="contained"
        color="primary"
        onClick={handleFinalize}
        disabled={!canFinalize || isLoading}
        fullWidth
        size="large"
        startIcon={
          isLoading ? <CircularProgress size={20} color="inherit" /> : null
        }
      >
        {isLoading ? 'Finalizing...' : 'Finalize Account'}
      </Button>
    </Box>
  );
}
