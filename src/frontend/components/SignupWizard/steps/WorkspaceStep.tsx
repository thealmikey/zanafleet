import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material';

import { useSignupWizard } from '../../../hooks/useSignupWizard';
import { getAllowedWorkspaceTypes, listWorkspaces } from '../../../services/signupApi';
import { Workspace } from '../../../types';

export function WorkspaceStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    async function fetchWorkspaces(): Promise<void> {
      if (!formData.actorType) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const workspaceTypes = await getAllowedWorkspaceTypes(formData.actorType);

        if (workspaceTypes.length === 0) {
          setWorkspaces([]);
          setLoading(false);
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

  const selectedWorkspace = useMemo((): Workspace | null => {
    if (formData.workspaceIds.length === 0) return null;
    return workspaces.find((ws) => ws.workspaceId === formData.workspaceIds[0]) ?? null;
  }, [workspaces, formData.workspaceIds]);

  const validationError = useMemo((): string | null => {
    if (!touched) return null;
    if (workspaces.length > 0 && formData.workspaceIds.length === 0) {
      return 'Please select a workspace';
    }
    return null;
  }, [touched, workspaces.length, formData.workspaceIds.length]);

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: Workspace | null): void => {
      const selectedIds = newValue ? [newValue.workspaceId] : [];
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
        Select the workspace to associate with your account.
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
            Workspace{' '}
            <Typography component="span" color="error">
              *
            </Typography>
          </FormLabel>
          <Autocomplete
            options={workspaces}
            getOptionLabel={(option) => option.name}
            value={selectedWorkspace}
            onChange={handleChange}
            onBlur={handleBlur}
            loading={loading}
            disabled={isLoading || loading}
            isOptionEqualToValue={(option, value) => option.workspaceId === value.workspaceId}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={loading ? 'Loading workspaces...' : 'Select a workspace'}
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
            Select the workspace you want to join. Contact your administrator if you need access to
            a different workspace.
          </FormHelperText>
        </FormControl>
      )}
    </Box>
  );
}
