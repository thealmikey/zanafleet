import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material';

import { useSignupWizard } from '../../../hooks/useSignupWizard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function WorkspaceStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [touched, setTouched] = useState(false);

  const currentWorkspaceId = formData.workspaceIds[0] ?? '';

  const validationError = useMemo((): string | null => {
    if (!touched) return null;
    if (formData.workspaceIds.length === 0 || formData.workspaceIds[0]?.trim() === '') {
      return 'Workspace ID is required';
    }
    if (!isValidUuid(formData.workspaceIds[0])) {
      return 'Please enter a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)';
    }
    return null;
  }, [formData.workspaceIds, touched]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      updateField('workspaceIds', value ? [value] : []);
    },
    [updateField],
  );

  const handleBlur = useCallback((): void => {
    setTouched(true);
  }, []);

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Workspace Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the workspace ID to associate with your account. This links your account to a specific organization or team.
      </Typography>

      <FormControl fullWidth required error={!!validationError}>
        <FormLabel sx={{ mb: 1 }}>
          Workspace ID <Typography component="span" color="error">*</Typography>
        </FormLabel>
        <TextField
          name="workspaceId"
          value={currentWorkspaceId}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="123e4567-e89b-12d3-a456-426614174000"
          disabled={isLoading}
          error={!!validationError}
          helperText={validationError}
          fullWidth
          variant="outlined"
          inputProps={{
            'aria-label': 'Workspace ID',
            'aria-required': true,
          }}
        />
        <FormHelperText sx={{ mt: 1, ml: 0 }}>
          Enter the UUID of your workspace. Contact your administrator if you do not have one.
        </FormHelperText>
      </FormControl>
    </Box>
  );
}
