import React, { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

export interface FilterValues {
  startDate?: string;
  endDate?: string;
  status?: string;
  radius?: number;
  limit?: number;
}

export interface StatusOption {
  label: string;
  value: string;
}

export interface FiltersProps {
  startDate?: string;
  endDate?: string;
  status?: string;
  statusOptions?: StatusOption[];
  radius?: number;
  limit?: number;
  onChange: (partial: Partial<FilterValues>) => void;
  onApply?: () => void;
  onClear?: () => void;
  collapsedByDefault?: boolean;
  title?: string;
}

export function Filters({
  startDate = '',
  endDate = '',
  status = '',
  statusOptions = [],
  radius,
  limit,
  onChange,
  onApply,
  onClear,
  collapsedByDefault = false,
  title = 'Filters',
}: FiltersProps): React.ReactElement {
  const [expanded, setExpanded] = useState(!collapsedByDefault);

  const handleClear = (): void => {
    onChange({
      startDate: undefined,
      endDate: undefined,
      status: undefined,
      radius: undefined,
      limit: undefined,
    });
    onClear?.();
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse filters' : 'Expand filters'}
          size="small"
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              id="filter-start-date"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => onChange({ startDate: e.target.value || undefined })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              id="filter-end-date"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => onChange({ endDate: e.target.value || undefined })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>

          {statusOptions.length > 0 && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-status-label">Status</InputLabel>
                <Select
                  labelId="filter-status-label"
                  id="filter-status"
                  value={status}
                  label="Status"
                  onChange={(e) => onChange({ status: e.target.value || undefined })}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {statusOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              id="filter-radius"
              label="Radius (meters)"
              type="number"
              value={radius ?? ''}
              onChange={(e) =>
                onChange({ radius: e.target.value ? Number(e.target.value) : undefined })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              id="filter-limit"
              label="Limit"
              type="number"
              value={limit ?? ''}
              onChange={(e) =>
                onChange({ limit: e.target.value ? Number(e.target.value) : undefined })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              inputProps={{ min: 1 }}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {onApply && (
            <Button variant="contained" size="small" onClick={onApply}>
              Apply
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={handleClear}>
            Clear
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}
