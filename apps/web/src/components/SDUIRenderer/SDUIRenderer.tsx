import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Container,
  Grid,
  Stack,
  CircularProgress,
  LinearProgress,
  Alert,
  Divider,
  Avatar,
  Link,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs as MuiTabs,
  Tab,
  Autocomplete,
  Select,
  MenuItem,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
// Import chart components for SDUI rendering
import { LineChart, DoughnutChart } from '../common/Charts';
import { KPIGrid, KPIGridItem } from '../common/KPIGrid';
import {
  UISchema,
  LayoutNode,
  ComponentRef,
  ActionDefinition,
} from '../../types/sdui.types';
import { executeAction } from '../../services/sduiApi';

interface SDUIRendererProps {
  schema: UISchema;
  screenId: string;
  actorId?: string;
  onNavigate?: (path: string) => void;
  onActionComplete?: (actionId: string, result: unknown) => void;
  /** Current authentication state - if not provided, auth checks are skipped */
  isAuthenticated?: boolean;
  /** Callback when auth is required but user is not authenticated */
  onAuthRequired?: (currentPath: string) => void;
}

export const SDUIRenderer: React.FC<SDUIRendererProps> = ({
  schema,
  screenId,
  actorId,
  onNavigate,
  onActionComplete,
  isAuthenticated,
  onAuthRequired,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabState, setTabState] = useState<Record<string, string>>({});

  // Reset form when screen changed
  useEffect(() => {
    setFormData({});
    setFormErrors({});
    setError(null);
    setTabState({});
  }, [screenId]);

  // Check auth requirements - extends ProtectedRoute functionality
  useEffect(() => {
    if (isAuthenticated === undefined || !onAuthRequired) {
      return; // Skip if auth not configured
    }

    const authRequirement = schema.metadata?.auth;
    if (authRequirement === 'required' && !isAuthenticated) {
      onAuthRequired(`/sdui/${screenId}`);
    }
  }, [schema.metadata?.auth, isAuthenticated, onAuthRequired, screenId]);

  // Get component props with binding resolution
  const resolveProps = useCallback((component: ComponentRef): Record<string, unknown> => {
    const props = { ...component.props };
    // Resolve any {{binding}} expressions
    Object.keys(props).forEach((key) => {
      const value = props[key];
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const bindingPath = value.slice(2, -2);
        // Try to resolve from schema.data static data
        if (schema.data) {
          const dataSource = schema.data.find((ds) => ds.id === bindingPath.split('.')[0]);
          if (dataSource?.staticData) {
            const pathParts = bindingPath.split('.');
            let resolved: unknown = dataSource.staticData;
            for (const part of pathParts.slice(1)) {
              resolved = (resolved as Record<string, unknown>)?.[part];
            }
            props[key] = resolved as string;
          }
        }
      }
    });
    return props;
  }, [schema.data]);

  // Validate a field
  const validateField = useCallback(
    (fieldName: string, value: string): string | null => {
      const validations = schema.validations?.filter((v) => v.field === fieldName);
      if (!validations) return null;

      const stringValue = String(value ?? '');
      for (const rule of validations) {
        switch (rule.type) {
          case 'required':
            if (!stringValue.trim()) return rule.message || 'Required';
            break;
          case 'email':
            if (stringValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
              return rule.message || 'Invalid email';
            }
            break;
          case 'minLength':
            if (stringValue.length < (rule.params?.min as number || 0)) {
              return rule.message || `Min ${rule.params?.min} chars`;
            }
            break;
          case 'maxLength':
            if (stringValue.length > (rule.params?.max as number || Infinity)) {
              return rule.message || `Maximum length is ${rule.params?.max}`;
            }
            break;
        }
      }
      return null;
    },
    [schema.validations]
  );

  const handleInputChange = useCallback(
    (fieldName: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }));
      if (formErrors[fieldName]) {
        setFormErrors((prev) => ({ ...prev, [fieldName]: '' }));
      }
    },
    [formErrors]
  );

  const handleAction = useCallback(
    async (action: ActionDefinition, formPayload?: Record<string, unknown>) => {
      if (action.type === 'navigate' && (action.navigateTo || action.target)) {
        onNavigate?.(action.navigateTo || action.target || '');
        return;
      }

      if (action.type === 'submit' || action.type === 'api') {
        setLoading(action.id);
        setError(null);

        try {
          const payload = formPayload || formData;
          const result = await executeAction(screenId, action.id, payload, actorId);

          if (result.success) {
            onActionComplete?.(action.id, result);
            if (result.navigateTo || result.redirect) {
              onNavigate?.(result.navigateTo || result.redirect || '');
            }
          } else {
            setError(result.error || result.message || 'Action failed');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
          setLoading(null);
        }
      }
    },
    [screenId, actorId, formData, onNavigate, onActionComplete]
  );

  const handleSubmit = useCallback(() => {
    // Validate all fields
    const errors: Record<string, string> = {};
    const fieldNames = new Set(schema.validations?.map((v) => v.field) || []);
    
    fieldNames.forEach((fieldName) => {
      const error = validateField(fieldName, String(formData[fieldName] ?? ''));
      if (error) {
        errors[fieldName] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Find submit action
    const submitAction = schema.actions?.find((a) => a.type === 'submit');
    if (submitAction) {
      handleAction(submitAction, formData);
    }
  }, [schema, formData, validateField, handleAction]);

  const toSxDimension = (value: unknown): string | number | undefined => {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string') return value;
    return undefined;
  };

  // Render a single component based on its type.
  // Note: this is intentionally a plain function (not useCallback) because it is mutually recursive
  // with renderLayoutNode, and stable keys matter more than memoization for SDUI correctness.
  function renderComponent(component: ComponentRef, keyBase: string): React.ReactNode {
    const { component: type, id } = component;
    const props = resolveProps(component);
    const key = id || `${keyBase}:${type}`;
    const sx = (props.sx as Record<string, unknown> | undefined) ?? undefined;

    switch (type) {
      case 'Logo':
        return (
          <Box key={key} sx={{ textAlign: 'center', my: 2, ...(sx as any) }}>
            <Avatar
              src={props.src as string}
              alt={props.alt as string}
              sx={{ width: props.height as number, height: props.height as number, mx: 'auto' }}
            />
          </Box>
        );

      case 'Container':
        return (
          <Container
            key={key}
            maxWidth={(props.maxWidth as any) || 'lg'}
            disableGutters={props.disableGutters as boolean}
            sx={sx as any}
          >
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.container.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.container.${_idx}`);
              return null;
            })}
          </Container>
        );

      case 'Typography':
        return (
          <Typography
            key={key}
            variant={(props.variant as any) || 'body1'}
            align={(props.align as any) || 'left'}
            color={(props.color as any) || 'initial'}
            sx={sx as any}
          >
            {props.content as string}
          </Typography>
        );

      case 'TextField': {
        const name = props.name as string;
        const label = props.label as string;
        return (
          <TextField
            key={key}
            fullWidth={props.fullWidth as boolean}
            label={label}
            name={name}
            type={props.type as string}
            placeholder={props.placeholder as string}
            value={String(formData[name] ?? '')}
            onChange={(e) => handleInputChange(name, e.target.value)}
            error={!!formErrors[name]}
            helperText={formErrors[name]}
            required={props.required as boolean}
            autoComplete={props.autoComplete as string}
            size={(props.size as any) || 'medium'}
            sx={sx as any}
          />
        );
      }

      case 'Autocomplete': {
        const acName = props.name as string;
        const acLabel = props.label as string;
        const acOptions = (props.options as Array<{ label: string; value: string }>) || [];
        const acOptions2 = (props.options as string[]) || [];
        // Handle both object arrays and string arrays
        const displayOptions = acOptions.length > 0 
          ? acOptions 
          : acOptions2.map(opt => ({ label: opt, value: opt }));
        const currentValue = String(formData[acName] ?? '');
        const selectedOption =
          displayOptions.find((opt) => opt.value === currentValue) ?? null;

        return (
          <Autocomplete
            key={key}
            freeSolo={props.freeSolo as boolean}
            options={displayOptions}
            isOptionEqualToValue={(option, value) => {
              if (typeof value === 'string') return option.value === value;
              return option.value === (value as { value: string }).value;
            }}
            getOptionLabel={(option) => typeof option === 'string' ? option : (option.label || '')}
            value={(props.freeSolo ? (currentValue || '') : selectedOption) as any}
            inputValue={currentValue}
            onChange={(_event, value) => {
              const selectedValue = typeof value === 'string' ? value : (value?.value || '');
              handleInputChange(acName, selectedValue);
            }}
            onInputChange={(_event, value) => {
              if (props.freeSolo) handleInputChange(acName, value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={acLabel}
                placeholder={props.placeholder as string}
                required={props.required as boolean}
                error={!!formErrors[acName]}
                helperText={formErrors[acName]}
                size={(props.size as any) || 'small'}
                fullWidth={props.fullWidth as boolean}
              />
            )}
            renderOption={(params, option) => (
              (() => {
                // MUI passes a `key` inside params; spreading it triggers a React warning.
                const { key: optionKey, ...liProps } = params as unknown as { key: string };
                return (
                  <Box component="li" key={optionKey} {...(liProps as any)}>
                    {typeof option === 'string' ? option : option.label}
                  </Box>
                );
              })()
            )}
            sx={sx as any}
          />
        );
      }

      case 'Select': {
        const selName = props.name as string;
        const selOptions = (props.options as Array<{ label: string; value: string }>) || [];
        const selOptions2 = (props.options as string[]) || [];
        const options = selOptions.length > 0 ? selOptions : selOptions2.map((opt) => ({ label: opt, value: opt }));
        const value = (formData[selName] ?? '') as string;
        return (
          <Select
            key={key}
            fullWidth={props.fullWidth as boolean}
            value={value}
            displayEmpty={props.displayEmpty as boolean}
            size={(props.size as any) || 'small'}
            onChange={(e) => handleInputChange(selName, e.target.value)}
            sx={sx as any}
          >
            {options.map((opt) => (
              <MenuItem key={`${key}-${opt.value}`} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        );
      }

      case 'MenuItem':
        return (
          <MenuItem key={key} value={props.value as string}>
            {props.content as string}
          </MenuItem>
        );

      case 'Switch': {
        const swName = props.name as string;
        const checked = Boolean(formData[swName]);
        return (
          <Switch
            key={key}
            checked={checked}
            onChange={(e) => handleInputChange(swName, e.target.checked)}
            color={(props.color as any) || 'primary'}
            sx={sx as any}
          />
        );
      }

      case 'ToggleButtonGroup': {
        const tgName = props.name as string;
        const tgLabel = props.label as string;
        const tgOptions = (props.options as Array<{ value: string; label: string; icon?: string }>) || [];
        const currentValue = String(formData[tgName] ?? '');
        return (
          <Box key={key}>
            {tgLabel && (
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {tgLabel}
              </Typography>
            )}
            <ToggleButtonGroup
              value={currentValue}
              exclusive
              onChange={(_event, value) => {
                if (value !== null) {
                  handleInputChange(tgName, value);
                }
              }}
              fullWidth={props.fullWidth as boolean}
              size={props.size as 'small' | 'medium'}
            >
              {tgOptions.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {formErrors[tgName] && (
              <Typography variant="caption" color="error">
                {formErrors[tgName]}
              </Typography>
            )}
          </Box>
        );
      }

      case 'Button':
        return (
          <Button
            key={key}
            variant={(props.variant as any) || 'contained'}
            color={(props.color as any) || 'primary'}
            size={(props.size as any) || 'medium'}
            fullWidth={props.fullWidth as boolean}
            type={props.type as 'submit' | 'button' | 'reset'}
            disabled={loading !== null}
            onClick={() => {
              const action = schema.actions?.find((a) => a.id === id);
              if (action) handleAction(action);
              else if (props.type === 'submit') handleSubmit();
            }}
            sx={sx as any}
          >
            {loading ? <CircularProgress size={20} /> : props.content as string}
          </Button>
        );

      case 'Link':
        return (
          <Link
            key={key}
            href={props.href as string}
            align={(props.align as any) || 'left'}
            underline="hover"
            sx={{ display: 'block', my: 1 }}
          >
            {props.content as string}
          </Link>
        );

      case 'Divider':
        return (
          <Divider key={key} sx={{ my: 2, ...(sx as any) }}>
            {props.text as string}
          </Divider>
        );

      case 'LinearProgress':
        return (
          <LinearProgress
            key={key}
            variant={(props.variant as any) || 'indeterminate'}
            value={props.value as number}
            color={(props.color as any) || 'primary'}
            sx={sx as any}
          />
        );

      case 'Alert':
        return (
          <Alert key={key} severity={(props.severity as any) || 'info'} sx={{ mb: 2, ...(sx as any) }}>
            {props.content as string}
          </Alert>
        );

      case 'Paper':
        return (
          <Paper
            key={key}
            elevation={(props.elevation as number) ?? 1}
            sx={{
              p: (props.padding as number) ?? undefined,
              bgcolor: (props.backgroundColor as string) ?? undefined,
              ...(sx as any),
            }}
          >
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.paper.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.paper.${_idx}`);
              return null;
            })}
          </Paper>
        );

      case 'Card':
        return (
          <Card key={key} sx={sx as any}>
            <CardContent>
              <>
                {props.title && (
                  <Typography variant="h6" gutterBottom>
                    {String(props.title)}
                  </Typography>
                )}
                {props.content && (
                  <Typography variant="body2">{String(props.content)}</Typography>
                )}
              </>
            </CardContent>
          </Card>
        );

      case 'CardMedia':
        return (
          <CardMedia
            key={key}
            component={(props.component as any) || 'img'}
            image={props.image as string}
            src={props.src as string}
            alt={props.alt as string}
            sx={sx as any}
          />
        );

      case 'Chip':
        return (
          <Chip
            key={key}
            label={props.label as string}
            color={(props.color as any) || 'default'}
            size={(props.size as any) || 'medium'}
          />
        );

      case 'MetricCard':
        return (
          <Card
            key={key}
            sx={{
              height: '100%',
              flex: '1 1 220px',
              minWidth: 200,
              ...(sx as any),
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                {String(props.label || '')}
              </Typography>
              <Typography variant="h4" color={props.trend === 'up' ? 'success.main' : props.trend === 'down' ? 'error.main' : 'inherit'}>
                {String(props.value || '0')}
              </Typography>
              <>
                {props.change ? (
                  <Typography variant="body2" color={props.trend === 'up' ? 'success.main' : props.trend === 'down' ? 'error.main' : 'text.secondary'}>
                    {String(props.change)}
                  </Typography>
                ) : null}
              </>
            </CardContent>
          </Card>
        );

      case 'LineChart': {
        // LineChart expects data in react-chartjs-2 format
        const chartData = props.data as {
          labels?: string[];
          datasets?: Array<{
            label?: string;
            data?: number[];
            borderColor?: string;
            backgroundColor?: string;
          }>;
        };
        // Ensure data is properly typed for the chart
        const lineData = chartData?.datasets?.map(ds => ({
          ...ds,
          data: ds.data || [],
        })) || [];
        const title = props.title as string | undefined;
        return (
          <Card key={key}>
            <CardContent>
              {title && (
                <Typography variant="subtitle1" gutterBottom>
                  {title}
                </Typography>
              )}
              <LineChart
                data={{
                  labels: chartData?.labels || [],
                  datasets: lineData as any,
                }}
                height={Number(props.height) || 240}
                ariaLabel={title || 'Line Chart'}
              />
            </CardContent>
          </Card>
        );
      }

      case 'DoughnutChart': {
        // DoughnutChart expects data in react-chartjs-2 format
        const chartData = props.data as {
          labels?: string[];
          datasets?: Array<{
            label?: string;
            data?: number[];
            backgroundColor?: string[];
          }>;
        };
        // Ensure data is properly typed for the chart
        const doughnutData = chartData?.datasets?.map(ds => ({
          ...ds,
          data: ds.data || [],
        })) || [];
        const title = props.title as string | undefined;
        return (
          <Card key={key}>
            <CardContent>
              {title && (
                <Typography variant="subtitle1" gutterBottom>
                  {title}
                </Typography>
              )}
              <DoughnutChart
                data={{
                  labels: chartData?.labels || [],
                  datasets: doughnutData as any,
                }}
                height={Number(props.height) || 240}
                ariaLabel={title || 'Doughnut Chart'}
              />
            </CardContent>
          </Card>
        );
      }

      case 'KPIGrid': {
        // KPIGrid expects items array with title, value, icon, color, loading
        const items = (props.items as Array<{
          title?: string;
          value?: string;
          icon?: React.ReactNode;
          color?: string;
          loading?: boolean;
        }>) || [];
        const kpiItems: KPIGridItem[] = items.map((item) => ({
          title: item.title || '',
          value: item.value || '-',
          loading: item.loading || false,
        }));
        return (
          <Box key={key} sx={{ mb: 3 }}>
            <KPIGrid items={kpiItems} md={Number(props.columns) || 3} />
          </Box>
        );
      }

      case 'Tabs':
        return (
          <Box key={key} sx={sx as any}>
            {(() => {
              const rawTabs = (props.tabs as unknown[]) || [];
              const labels = rawTabs.map((tab) => {
                if (typeof tab === 'string') return tab;
                if (tab && typeof tab === 'object' && 'label' in tab) {
                  return (tab as { label: string }).label;
                }
                return String(tab);
              });
              const tabKey = id || key;
              const value = tabState[tabKey] ?? labels[0] ?? false;
              return (
                <MuiTabs
                  value={value}
                  onChange={(_event, newValue) => {
                    if (typeof newValue === 'string') {
                      setTabState((prev) => ({ ...prev, [tabKey]: newValue }));
                    }
                  }}
                  sx={{ mb: 2 }}
                >
                  {labels.length > 0
                    ? labels.map((tabLabel, idx) => (
                        <Tab key={`tab-${idx}`} label={tabLabel} value={tabLabel} />
                      ))
                    : <Tab label="Tab 1" value="Tab 1" />}
                </MuiTabs>
              );
            })()}
          </Box>
        );

      case 'DataTable':
        const columns = (props.columns as { key: string; label: string }[]) || [];
        const rows = (props.rows as Record<string, unknown>[]) || [];
        // Debug log for DataTable
        if (process.env.NODE_ENV === 'development') {
          console.debug('[SDUI] Rendering DataTable:', { id, columns: columns.length, rows: rows.length });
        }
        return (
          <TableContainer key={key} component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((col, _cIdx) => (
                    <TableCell key={`header-${_cIdx}-${col.key}`} sx={{ fontWeight: 'bold' }}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, _rIdx) => (
                  <TableRow key={`row-${_rIdx}`}>
                    {columns.map((col, _cIdx) => (
                      <TableCell key={`cell-${_rIdx}-${_cIdx}-${col.key}`}>{String(row[col.key] ?? '')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'Form':
        // Form component - renders children via the layout system
        // Debug log to help identify rendering issues
        if (process.env.NODE_ENV === 'development') {
          console.debug('[SDUI] Rendering Form component:', { id, props, children: component.children });
        }
        return (
          <Box
            key={key}
            component="form"
            sx={{
              width: '100%',
              mt: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: (props.spacing as number) ?? (props.gap as number) ?? undefined,
              ...(sx as any),
            }}
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {Object.keys(formErrors).length > 0 && (
              <Alert variant="outlined" severity="error" sx={{ mb: 2 }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {Object.keys(formErrors).map((fieldName) => (
                    <li key={fieldName}>{formErrors[fieldName]}</li>
                  ))}
                </ul>
              </Alert>
            )}
            {/* Render nested layout children within the form */}
            {component.children?.map((child, _idx) => {
              // Handle LayoutNode children
              if ('type' in child) {
                return renderLayoutNode(child as LayoutNode, `${keyBase}.form.${_idx}`);
              }
              // Handle ComponentRef children
              if ('component' in child) {
                return renderComponent(child as ComponentRef, `${keyBase}.form.${_idx}`);
              }
              return null;
            })}
          </Box>
        );

      case 'Dialog': {
        const isOpen = Boolean(props.open);
        return (
          <Dialog key={key} open={isOpen} onClose={() => handleInputChange(id || 'dialog', false)}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.dialog.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.dialog.${_idx}`);
              return null;
            })}
          </Dialog>
        );
      }

      case 'DialogTitle':
        return (
          <DialogTitle key={key} sx={sx as any}>
            {props.content as string}
          </DialogTitle>
        );

      case 'DialogContent':
        return (
          <DialogContent key={key} sx={sx as any}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.dialogContent.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.dialogContent.${_idx}`);
              return null;
            })}
          </DialogContent>
        );

      case 'DialogActions':
        return (
          <DialogActions key={key} sx={sx as any}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.dialogActions.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.dialogActions.${_idx}`);
              return null;
            })}
          </DialogActions>
        );

      case 'Stepper': {
        const steps = (props.steps as string[]) || [];
        const activeStep = (props.activeStep as number) ?? 0;
        return (
          <Stepper
            key={key}
            activeStep={activeStep}
            orientation={(props.orientation as any) || 'horizontal'}
            sx={sx as any}
          >
            {steps.map((label, idx) => (
              <Step key={`${key}-step-${idx}`}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        );
      }

      case 'List':
        return (
          <List key={key} disablePadding={props.disablePadding as boolean} sx={sx as any}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.list.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.list.${_idx}`);
              return null;
            })}
          </List>
        );

      case 'ListItem':
        return (
          <ListItem key={key} divider={props.divider as boolean} disablePadding={props.disablePadding as boolean}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.listItem.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.listItem.${_idx}`);
              return null;
            })}
          </ListItem>
        );

      case 'ListItemButton':
        return (
          <ListItemButton key={key} sx={sx as any}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.listItemButton.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.listItemButton.${_idx}`);
              return null;
            })}
          </ListItemButton>
        );

      case 'ListItemAvatar':
        return (
          <ListItemAvatar key={key} sx={sx as any}>
            {component.children?.map((child, _idx) => {
              if ('type' in child) return renderLayoutNode(child as LayoutNode, `${keyBase}.listItemAvatar.${_idx}`);
              if ('component' in child) return renderComponent(child as ComponentRef, `${keyBase}.listItemAvatar.${_idx}`);
              return null;
            })}
          </ListItemAvatar>
        );

      case 'ListItemText':
        return (
          <ListItemText
            key={key}
            primary={props.primary as string}
            secondary={props.secondary as string}
          />
        );

      case 'Box': {
        const boxWidth = props.width as string;
        return (
          <Box
            key={key}
            sx={{
              width: boxWidth || 'auto',
              display: props.display || 'flex',
              alignItems: props.alignItems || 'flex-start',
              justifyContent: props.justifyContent || 'flex-start',
              flexDirection: props.flexDirection || 'row',
              gap: (props.spacing as number) || 2,
              ...(sx as any),
            }}
          >
            {component.children?.map((child, _idx) => {
              if ('type' in child) {
                return renderLayoutNode(child as LayoutNode, `${keyBase}.box.${_idx}`);
              }
              if ('component' in child) {
                return renderComponent(child as ComponentRef, `${keyBase}.box.${_idx}`);
              }
              return null;
            })}
          </Box>
        );
      }

      case 'GridItem': {
        const gridXs = props.xs as number;
        const gridSm = props.sm as number;
        const gridMd = props.md as number;
        const gridLg = props.lg as number;
        const gridXl = props.xl as number;
        return (
          <Grid
            item
            xs={gridXs || 12}
            sm={gridSm || gridXs || 12}
            md={gridMd || gridSm || gridXs || 12}
            lg={gridLg}
            xl={gridXl}
            key={key}
          >
            {component.children?.map((child, _idx) => {
              if ('type' in child) {
                return renderLayoutNode(child as LayoutNode, `${keyBase}.gridItem.${_idx}`);
              }
              if ('component' in child) {
                return renderComponent(child as ComponentRef, `${keyBase}.gridItem.${_idx}`);
              }
              return null;
            })}
          </Grid>
        );
      }

      default:
        // Debug log for unknown components to help identify issues
        console.warn(`[SDUI] Unknown component: ${type}`, { id, props });
        return (
          <Box key={key} sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
            <Typography variant="caption" color="warning.main">
              Unknown component: {type}
            </Typography>
          </Box>
        );
    }
  }

  // Render a layout node recursively
  function renderLayoutNode(node: LayoutNode, keyBase: string): React.ReactNode {
    const { type, children, components, props: layoutProps } = node;
    const key = `${keyBase}:${type}`;

    // Render child components first
    const renderedComponents = components?.map((c, idx) => renderComponent(c, `${keyBase}.cmp.${idx}`)) || [];

    // Then render children layout nodes
    const renderedChildren = children?.map((c, idx) => renderLayoutNode(c, `${keyBase}.child.${idx}`)) || [];

    // Stack layout (vertical)
    if (type === 'stack') {
      const gridColumn = layoutProps?.gridColumn as string | undefined;
      return (
        <Box
          key={key}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: (layoutProps?.spacing as number) || 2,
            width: (layoutProps?.width as string) || '100%',
            maxWidth: toSxDimension(layoutProps?.maxWidth),
            padding: (layoutProps?.padding as number) ?? 0,
            mx: 'auto',
            bgcolor: (layoutProps?.backgroundColor as string) ?? undefined,
            background: (layoutProps?.background as string) ?? undefined,
            borderRadius: (layoutProps?.borderRadius as number) ?? undefined,
            ...(gridColumn ? { gridColumn } : {}),
          }}
        >
          {renderedComponents}
          {renderedChildren}
        </Box>
      );
    }

    // Flex layout (also used within grid)
    if (type === 'flex') {
      const gridColumn = layoutProps?.gridColumn as string | undefined;
      return (
        <Box
          key={key}
          sx={{
            display: 'flex',
            flexDirection: (layoutProps?.direction as any) || 'column',
            alignItems: (layoutProps?.align as any) || 'flex-start',
            justifyContent: (layoutProps?.justify as any) || 'flex-start',
            gap: (layoutProps?.spacing as number) || 2,
            minHeight: layoutProps?.fullHeight ? '100vh' : 'auto',
            flexWrap: layoutProps?.wrap ? 'wrap' : 'nowrap',
            width: (layoutProps?.width as string) || '100%',
            maxWidth: toSxDimension(layoutProps?.maxWidth),
            padding: (layoutProps?.padding as number) ?? 0,
            bgcolor: (layoutProps?.backgroundColor as string) ?? undefined,
            background: (layoutProps?.background as string) ?? undefined,
            borderRadius: (layoutProps?.borderRadius as number) ?? undefined,
            // Grid column support for nested layouts within grid
            ...(gridColumn ? { gridColumn } : {}),
          }}
        >
          {renderedComponents}
          {renderedChildren}
        </Box>
      );
    }

    // Grid layout
    if (type === 'grid') {
      const hasGridItems = (components || []).some((component) => component.component === 'GridItem');
      if (!hasGridItems) {
        const columns = layoutProps?.columns as number | undefined;
        const gridTemplateColumns = (layoutProps?.gridTemplateColumns as string) ||
          (columns ? `repeat(${columns}, minmax(0, 1fr))` : 'repeat(12, minmax(0, 1fr))');
        return (
          <Box
            key={key}
            sx={{
              display: 'grid',
              gridTemplateColumns,
              columnGap: (layoutProps?.spacing as number) || 2,
              rowGap: (layoutProps?.spacing as number) || 2,
              width: (layoutProps?.width as string) || '100%',
              maxWidth: toSxDimension(layoutProps?.maxWidth),
              mx: layoutProps?.maxWidth ? 'auto' : undefined,
              p: (layoutProps?.padding as number) ?? undefined,
              bgcolor: (layoutProps?.backgroundColor as string) ?? undefined,
              background: (layoutProps?.background as string) ?? undefined,
              borderRadius: (layoutProps?.borderRadius as number) ?? undefined,
            }}
          >
            {renderedComponents}
            {renderedChildren}
          </Box>
        );
      }
      return (
        <Grid
          container
          spacing={(layoutProps?.spacing as number) || 2}
          key={key}
          sx={{
            width: (layoutProps?.width as string) || '100%',
            maxWidth: toSxDimension(layoutProps?.maxWidth),
            mx: layoutProps?.maxWidth ? 'auto' : undefined,
            p: (layoutProps?.padding as number) ?? undefined,
            bgcolor: (layoutProps?.backgroundColor as string) ?? undefined,
            background: (layoutProps?.background as string) ?? undefined,
            borderRadius: (layoutProps?.borderRadius as number) ?? undefined,
          }}
        >
          {renderedComponents}
          {renderedChildren}
        </Grid>
      );
    }

    // Root layout
    if (type === 'root') {
      return (
        <Box
          key={key}
          sx={{
            p: (layoutProps?.padding as number) ?? 3,
            bgcolor: (layoutProps?.backgroundColor as string) ?? undefined,
            background: (layoutProps?.background as string) ?? undefined,
            borderRadius: (layoutProps?.borderRadius as number) ?? undefined,
          }}
        >
          {renderedComponents}
          {renderedChildren}
        </Box>
      );
    }

    // Default: render all
    return (
      <Box key={key}>
        {renderedComponents}
        {renderedChildren}
      </Box>
    );
  }

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Screen Title from metadata */}
      <Typography variant="h4" gutterBottom>
        {schema.metadata.title}
      </Typography>
      {schema.metadata.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {schema.metadata.description}
        </Typography>
      )}

      {/* Render the layout */}
      {renderLayoutNode(schema.layout, `layout.${schema.screenId || screenId}`)}

      {/* Global Actions (for non-form screens) */}
      {!schema.validations?.length && schema.actions && (
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          {schema.actions.map((action) => (
            <Button
              key={action.id}
              variant="contained"
              onClick={() => handleAction(action)}
              disabled={loading === action.id}
            >
              {loading === action.id ? <CircularProgress size={20} /> : action.label}
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default SDUIRenderer;
