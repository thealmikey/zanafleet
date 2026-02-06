import React, { useCallback } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';

import { useSignupWizard } from '../../../hooks/useSignupWizard';
import { ActorType } from '../../../types';

const ACTOR_TYPE_OPTIONS: { value: ActorType; label: string; description: string }[] = [
  {
    value: ActorType.Internal,
    label: 'Internal',
    description: 'Internal staff or administrator account',
  },
  {
    value: ActorType.Business,
    label: 'Business',
    description: 'General business account',
  },
  {
    value: ActorType.SaccoAdmin,
    label: 'SACCO Admin',
    description: 'Administrator for a SACCO organization',
  },
  {
    value: ActorType.BusinessOwner,
    label: 'Business Owner',
    description: 'Owner of a business entity',
  },
  {
    value: ActorType.Rider,
    label: 'Rider',
    description: 'Rider or driver account',
  },
  {
    value: ActorType.AIService,
    label: 'AI Service',
    description: 'Automated AI service account',
  },
];

export function AccountTypeStep(): React.ReactElement {
  const { formData, updateField, initSession, sessionId, isLoading } = useSignupWizard();

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const selectedType = event.target.value as ActorType;
      updateField('actorType', selectedType);

      if (!sessionId) {
        try {
          await initSession(selectedType);
        } catch {
          // Error is handled in context
        }
      }
    },
    [updateField, sessionId, initSession],
  );

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Account Type
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the type of account you want to create. This determines your permissions and available features.
      </Typography>

      <FormControl component="fieldset" required fullWidth disabled={isLoading}>
        <FormLabel component="legend" sx={{ mb: 1 }}>
          Account Type <Typography component="span" color="error">*</Typography>
        </FormLabel>
        <RadioGroup
          aria-label="account-type"
          name="actorType"
          value={formData.actorType ?? ''}
          onChange={handleChange}
        >
          {ACTOR_TYPE_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">{option.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              }
              sx={{
                alignItems: 'flex-start',
                mb: 1,
                py: 1,
                px: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            />
          ))}
        </RadioGroup>
        <FormHelperText>
          This field is required to proceed with registration
        </FormHelperText>
      </FormControl>
    </Box>
  );
}
