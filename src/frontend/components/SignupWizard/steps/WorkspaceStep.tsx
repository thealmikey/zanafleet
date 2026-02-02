import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import { useSignupWizard } from '../../../hooks/useSignupWizard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function WorkspaceStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [inputValue, setInputValue] = useState('');
  const [touched, setTouched] = useState(false);

  const inputValidationError = useMemo((): string | null => {
    if (!touched || inputValue.trim() === '') return null;
    if (!isValidUuid(inputValue)) {
      return 'Please enter a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)';
    }
    if (formData.workspaceIds.includes(inputValue)) {
      return 'This workspace ID has already been added';
    }
    return null;
  }, [inputValue, touched, formData.workspaceIds]);

  const listValidationError = useMemo((): string | null => {
    if (!touched) return null;
    if (formData.workspaceIds.length === 0) {
      return 'At least one workspace ID is required';
    }
    return null;
  }, [formData.workspaceIds, touched]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setInputValue(event.target.value);
    },
    [],
  );

  const handleAddWorkspace = useCallback((): void => {
    const trimmedValue = inputValue.trim();
    if (
      trimmedValue &&
      isValidUuid(trimmedValue) &&
      !formData.workspaceIds.includes(trimmedValue)
    ) {
      updateField('workspaceIds', [...formData.workspaceIds, trimmedValue]);
      setInputValue('');
      setTouched(false);
    } else {
      setTouched(true);
    }
  }, [inputValue, formData.workspaceIds, updateField]);

  const handleRemoveWorkspace = useCallback(
    (workspaceId: string): void => {
      updateField(
        'workspaceIds',
        formData.workspaceIds.filter((id) => id !== workspaceId),
      );
    },
    [formData.workspaceIds, updateField],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAddWorkspace();
      }
    },
    [handleAddWorkspace],
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
        Add the workspace IDs to associate with your account. You can join multiple workspaces.
      </Typography>

      <FormControl fullWidth required error={!!inputValidationError || !!listValidationError}>
        <FormLabel sx={{ mb: 1 }}>
          Workspace IDs <Typography component="span" color="error">*</Typography>
        </FormLabel>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            name="workspaceId"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="123e4567-e89b-12d3-a456-426614174000"
            disabled={isLoading}
            error={!!inputValidationError}
            helperText={inputValidationError}
            fullWidth
            variant="outlined"
            inputProps={{
              'aria-label': 'Workspace ID input',
            }}
          />
          <IconButton
            onClick={handleAddWorkspace}
            disabled={isLoading || !inputValue.trim() || !!inputValidationError}
            color="primary"
            aria-label="Add workspace"
            sx={{ mt: 0.5 }}
          >
            <AddIcon />
          </IconButton>
        </Stack>

        {formData.workspaceIds.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
            {formData.workspaceIds.map((workspaceId) => (
              <Chip
                key={workspaceId}
                label={workspaceId}
                onDelete={() => handleRemoveWorkspace(workspaceId)}
                disabled={isLoading}
                variant="outlined"
                sx={{ maxWidth: '100%' }}
              />
            ))}
          </Stack>
        )}

        {listValidationError && (
          <FormHelperText error sx={{ mt: 1, ml: 0 }}>
            {listValidationError}
          </FormHelperText>
        )}

        <FormHelperText sx={{ mt: 1, ml: 0 }}>
          Enter workspace UUIDs and click the add button or press Enter. Contact your administrator if you do not have one.
        </FormHelperText>
      </FormControl>
    </Box>
  );
}
