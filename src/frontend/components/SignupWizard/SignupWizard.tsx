import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import { useSignupWizard } from '../../hooks/useSignupWizard';
import { WIZARD_STEPS, WizardStepName } from '../../contexts/SignupWizardContext';
import { AccountTypeStep, WorkspaceStep, RolesStep, WalletsStep } from './steps';

const STEP_LABELS: Record<WizardStepName, string> = {
  'account-type': 'Account Type',
  workspace: 'Workspace',
  roles: 'Roles',
  wallets: 'Wallets',
  review: 'Review',
};

export interface SignupWizardProps {
  onComplete?: (result: { actorId: string; workspaceId: string }) => void;
}

export function SignupWizard({ onComplete }: SignupWizardProps): React.ReactElement {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    currentStep,
    formData,
    isLoading,
    error,
    nextStep,
    prevStep,
    finalize,
  } = useSignupWizard();

  const canProceed = useMemo((): boolean => {
    const stepName = WIZARD_STEPS[currentStep];
    switch (stepName) {
      case 'account-type':
        return formData.actorType !== null;
      case 'workspace':
        return formData.workspaceId !== null && formData.workspaceId.trim() !== '';
      case 'roles':
      case 'wallets':
        return true;
      case 'review':
        return formData.actorType !== null && formData.workspaceId !== null;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const canFinalize = useMemo((): boolean => {
    return formData.actorType !== null && formData.workspaceId !== null;
  }, [formData.actorType, formData.workspaceId]);

  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback((): void => {
    nextStep();
  }, [nextStep]);

  const handleBack = useCallback((): void => {
    prevStep();
  }, [prevStep]);

  const handleFinalize = useCallback(async (): Promise<void> => {
    try {
      const result = await finalize();
      onComplete?.(result);
    } catch {
      // Error is already set in context
    }
  }, [finalize, onComplete]);

  const renderStepContent = (): React.ReactNode => {
    const stepName = WIZARD_STEPS[currentStep];

    switch (stepName) {
      case 'account-type':
        return <AccountTypeStep />;
      case 'workspace':
        return <WorkspaceStep />;
      case 'roles':
        return <RolesStep />;
      case 'wallets':
        return <WalletsStep />;
      case 'review':
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review &amp; Confirm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review your selections before finalizing your account
            </Typography>
            <Box
              sx={{
                p: 3,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Account Type:</strong> {formData.actorType ?? 'Not selected'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Workspace ID:</strong> {formData.workspaceId ?? 'Not selected'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Roles:</strong>{' '}
                {formData.roles.length > 0 ? formData.roles.join(', ') : 'None assigned'}
              </Typography>
              <Typography variant="body1">
                <strong>Linked Wallets:</strong>{' '}
                {formData.linkedWallets.length > 0
                  ? `${formData.linkedWallets.length} wallet(s)`
                  : 'None linked'}
              </Typography>
              {formData.linkedWallets.length > 0 && (
                <Box sx={{ mt: 1, pl: 2 }}>
                  {formData.linkedWallets.map((wallet) => (
                    <Typography
                      key={wallet}
                      variant="caption"
                      sx={{ display: 'block', fontFamily: 'monospace' }}
                    >
                      {wallet}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 600, md: 800 },
        mx: 'auto',
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Stepper
        activeStep={currentStep}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        alternativeLabel={!isMobile}
        sx={{ mb: 4 }}
      >
        {WIZARD_STEPS.map((step) => (
          <Step key={step}>
            <StepLabel>{STEP_LABELS[step]}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Box sx={{ minHeight: 200 }}>{renderStepContent()}</Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          mt: 4,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={isFirstStep || isLoading}
          fullWidth={isMobile}
        >
          Back
        </Button>

        {isLastStep ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleFinalize}
            disabled={!canFinalize || isLoading}
            fullWidth={isMobile}
          >
            {isLoading ? 'Finalizing...' : 'Finalize'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            fullWidth={isMobile}
          >
            Next
          </Button>
        )}
      </Box>
    </Paper>
  );
}
