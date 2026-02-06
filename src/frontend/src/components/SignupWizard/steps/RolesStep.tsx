import React, { useCallback, useState } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material';

import { useSignupWizard } from '../../../hooks/useSignupWizard';

const SUGGESTED_ROLES = [
  'Admin',
  'Manager',
  'Operator',
  'Viewer',
  'Driver',
  'Dispatcher',
  'Finance',
  'Support',
];

export function RolesStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [inputValue, setInputValue] = useState('');

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string[]): void => {
      updateField('roles', newValue);
    },
    [updateField],
  );

  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, newInputValue: string): void => {
      setInputValue(newInputValue);
    },
    [],
  );

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Assign Roles
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select or type roles to assign to your account. Roles determine what actions you can perform within the workspace.
      </Typography>

      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1 }}>
          Roles <Typography component="span" color="text.secondary">(optional)</Typography>
        </FormLabel>
        <Autocomplete
          multiple
          freeSolo
          options={SUGGESTED_ROLES}
          value={formData.roles}
          onChange={handleChange}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          disabled={isLoading}
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  variant="outlined"
                  label={option}
                  size="small"
                  {...tagProps}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              placeholder={formData.roles.length === 0 ? 'Select or type roles...' : ''}
              inputProps={{
                ...params.inputProps,
                'aria-label': 'Roles',
              }}
            />
          )}
        />
        <FormHelperText sx={{ mt: 1, ml: 0 }}>
          You can select from suggestions or type custom role names. Press Enter to add a custom role.
        </FormHelperText>
      </FormControl>

      {formData.roles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected roles: {formData.roles.length}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
