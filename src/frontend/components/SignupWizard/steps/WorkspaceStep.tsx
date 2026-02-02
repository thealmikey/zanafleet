import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material';

import { useSignupWizard } from '../../../hooks/useSignupWizard';
import { getWorkspaceTypesForActor, listWorkspaces } from '../../../services/signupApi';
import { Workspace } from '../../../types';

export function WorkspaceStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    async function fetchWorkspaces(): Promise<void> {
      setLoading(true);
      setFetchError(null);

      try {
        const workspaceTypes = getWorkspaceTypesForActor(formData.actorType);

        if (workspaceTypes.length === 0) {
          setWorkspaces([]);
          return;
        }

        const workspacePromises = workspaceTypes.map((type) => listWorkspaces(type));
        const results = await Promise.all(workspacePromises);
        const allWorkspaces = results.flat();

        setWorkspaces(allWorkspaces);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load workspaces';
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    }

    void fetchWorkspaces();
  }, [formData.actorType]);

  const selectedWorkspaces = useMemo((): Workspace[] => {
    return workspaces.filter((ws) => formData.workspaceIds.includes(ws.workspaceId));
  }, [workspaces, formData.workspaceIds]);

  const validationError = useMemo((): string | null => {
    if (!touched) return null;
    if (workspaces.length > 0 && formData.workspaceIds.length === 0) {
      return 'Please select at least one workspace';
    }
    return null;
  }, [touched, workspaces.length, formData.workspaceIds.length]);

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: Workspace[]): void => {
      const selectedIds = newValue.map((ws) => ws.workspaceId);
      updateField('workspaceIds', selectedIds);
    },
    [updateField],
  );

  const handleBlur = useCallback((): void => {
    setTouched(true);
  }, []);

  const noWorkspacesAvailable = !loading && !fetchError && workspaces.length === 0;

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Workspace Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select the workspaces to associate with your account. You can join multiple workspaces.
      </Typography>

      {fetchError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {fetchError}
        </Typography>
      )}

      {noWorkspacesAvailable ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No workspaces are currently available for your account type. You may proceed without
          selecting a workspace, or contact your administrator.
        </Typography>
      ) : (
        <FormControl fullWidth required error={!!validationError}>
          <FormLabel sx={{ mb: 1 }}>
            Workspaces{' '}
            <Typography component="span" color="error">
              *
            </Typography>
          </FormLabel>
          <Autocomplete
            multiple
            options={workspaces}
            getOptionLabel={(option) => option.name}
            value={selectedWorkspaces}
            onChange={handleChange}
            onBlur={handleBlur}
            loading={loading}
            disabled={isLoading || loading}
            isOptionEqualToValue={(option, value) => option.workspaceId === value.workspaceId}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip key={key} label={option.name} variant="outlined" {...tagProps} />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={loading ? 'Loading workspaces...' : 'Select workspaces'}
                error={!!validationError}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading && <CircularProgress color="inherit" size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {validationError && (
            <FormHelperText error sx={{ mt: 1, ml: 0 }}>
              {validationError}
            </FormHelperText>
          )}

          <FormHelperText sx={{ mt: 1, ml: 0 }}>
            Select the workspaces you want to join. Contact your administrator if you need access to
            additional workspaces.
          </FormHelperText>
        </FormControl>
      )}
    </Box>
  );
}
