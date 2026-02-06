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
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import { useSignupWizard } from '../../../hooks/useSignupWizard';
import { FinalizeSignupResponse } from '../../../types';

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
      label: 'Workspace ID',
      value: formData.workspaceIds.length > 0 ? formData.workspaceIds[0] : null,
      isFilled: formData.workspaceIds.length > 0 && formData.workspaceIds[0]?.trim() !== '',
      isRequired: true,
      icon: <WorkspacesIcon />,
    },
    {
      label: 'Roles',
      value: formData.roles.length > 0 ? formData.roles.join(', ') : null,
      isFilled: formData.roles.length > 0,
      isRequired: false,
      icon: <BadgeIcon />,
    },
    {
      label: 'Linked Wallets',
      value:
        formData.linkedWallets.length > 0
          ? `${formData.linkedWallets.length} wallet(s)`
          : null,
      isFilled: formData.linkedWallets.length > 0,
      isRequired: false,
      icon: <AccountBalanceWalletIcon />,
    },
  ];

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

      {formData.linkedWallets.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Linked Wallet Addresses
          </Typography>
          {formData.linkedWallets.map((wallet) => (
            <Typography
              key={wallet}
              variant="caption"
              sx={{
                display: 'block',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                mb: 0.5,
              }}
            >
              {wallet}
            </Typography>
          ))}
        </Paper>
      )}

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
