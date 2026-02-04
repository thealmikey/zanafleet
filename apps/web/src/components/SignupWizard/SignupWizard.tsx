import React, { useCallback, useMemo, useState } from 'react';
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
import { ActorType, FinalizeSignupResponse } from '../../types';
import { AccountTypeStep, PersonalDetailsStep, ReviewStep } from './steps';

const STEP_LABELS: Record<WizardStepName, string> = {
  'account-type': 'Account Type',
  'personal-details': 'Personal Details',
  'review': 'Review',
};

export interface SignupWizardProps {
  onComplete?: (result: { actorId: string; workspaceId: string }) => void;
}

export function SignupWizard({ onComplete }: SignupWizardProps): React.ReactElement {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isFinalized, setIsFinalized] = useState(false);

  const {
    currentStep,
    formData,
    isLoading,
    error,
    nextStep,
    prevStep,
  } = useSignupWizard();

  const canProceed = useMemo((): boolean => {
    const stepName = WIZARD_STEPS[currentStep];
    switch (stepName) {
      case 'account-type':
        return formData.actorType !== null;
      case 'personal-details': {
        const hasRequiredFields =
          formData.fullName.trim() !== '' &&
          formData.nationalId.trim() !== '' &&
          formData.location.trim() !== '';

        // Check conditional fields based on actor type
        if (formData.actorType === ActorType.Business || formData.actorType === ActorType.BusinessOwner) {
          return hasRequiredFields && formData.businessName.trim() !== '';
        }
        // saccoId is optional for Riders
        return hasRequiredFields;
      }
      case 'review':
        return (
          formData.actorType !== null &&
          formData.fullName.trim() !== '' &&
          formData.nationalId.trim() !== '' &&
          formData.location.trim() !== ''
        );
      default:
        return false;
    }
  }, [currentStep, formData]);

  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback((): void => {
    nextStep();
  }, [nextStep]);

  const handleBack = useCallback((): void => {
    prevStep();
  }, [prevStep]);

  const handleReviewComplete = useCallback(
    (result: FinalizeSignupResponse): void => {
      setIsFinalized(true);
      onComplete?.(result);
    },
    [onComplete],
  );

  const renderStepContent = (): React.ReactNode => {
    const stepName = WIZARD_STEPS[currentStep];

    switch (stepName) {
      case 'account-type':
        return <AccountTypeStep />;
      case 'personal-details':
        return <PersonalDetailsStep />;
      case 'review':
        return <ReviewStep onComplete={handleReviewComplete} />;
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

      {!isLastStep && (
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

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            fullWidth={isMobile}
          >
            Next
          </Button>
        </Box>
      )}

      {isLastStep && !isFinalized && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            mt: 4,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={isLoading}
            fullWidth={isMobile}
          >
            Back
          </Button>
        </Box>
      )}
    </Paper>
  );
}
