import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  Link,
  Card,
  CardContent,
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
} from '@mui/material';
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
}

export const SDUIRenderer: React.FC<SDUIRendererProps> = ({
  schema,
  screenId,
  actorId,
  onNavigate,
  onActionComplete,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset form when screen changes
  useEffect(() => {
    setFormData({});
    setFormErrors({});
    setError(null);
  }, [screenId]);

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

      for (const rule of validations) {
        switch (rule.type) {
          case 'required':
            if (!value.trim()) return rule.message || 'Required';
            break;
          case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return rule.message || 'Invalid email';
            }
            break;
          case 'minLength':
            if (value.length < (rule.params?.min as number || 0)) {
              return rule.message || `Min ${rule.params?.min} chars`;
            }
            break;
          case 'maxLength':
            if (value.length > (rule.params?.max as number || Infinity)) {
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
    (fieldName: string, value: string) => {
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
      const error = validateField(fieldName, formData[fieldName] || '');
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

  // Render a single component based on its type
  const renderComponent = useCallback((component: ComponentRef): React.ReactNode => {
    const { component: type, id } = component;
    const props = resolveProps(component);
    const key = id || `${type}-${Math.random().toString(36).slice(2)}`;

    switch (type) {
      case 'Logo':
        return (
          <Box key={key} sx={{ textAlign: 'center', my: 2 }}>
            <Avatar
              src={props.src as string}
              alt={props.alt as string}
              sx={{ width: props.height as number, height: props.height as number, mx: 'auto' }}
            />
          </Box>
        );

      case 'Typography':
        return (
          <Typography
            key={key}
            variant={(props.variant as any) || 'body1'}
            align={(props.align as any) || 'left'}
            color={(props.color as any) || 'initial'}
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
            value={formData[name] || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            error={!!formErrors[name]}
            helperText={formErrors[name]}
            required={props.required as boolean}
            autoComplete={props.autoComplete as string}
          />
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
          <Divider key={key} sx={{ my: 2 }}>
            {props.text as string}
          </Divider>
        );

      case 'Alert':
        return (
          <Alert key={key} severity={(props.severity as any) || 'info'} sx={{ mb: 2 }}>
            {props.content as string}
          </Alert>
        );

      case 'Card':
        return (
          <Card key={key}>
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
          <Card key={key} sx={{ height: '100%' }}>
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

      case 'Tabs':
        return (
          <Box key={key}>
            <MuiTabs value={0} sx={{ mb: 2 }}>
              {(props.tabs as unknown[])?.map((tab, idx) => (
                <Tab key={idx} label={typeof tab === 'string' ? tab : String(tab)} />
              )) || <Tab label="Tab 1" />}
            </MuiTabs>
          </Box>
        );

      case 'DataTable':
        const columns = (props.columns as { key: string; label: string }[]) || [];
        const rows = (props.rows as Record<string, unknown>[]) || [];
        return (
          <TableContainer key={key} component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.key} sx={{ fontWeight: 'bold' }}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{String(row[col.key] ?? '')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      default:
        return (
          <Box key={key} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Unknown component: {type}
            </Typography>
          </Box>
        );
    }
  }, [formData, formErrors, loading, schema.actions, resolveProps, handleInputChange, handleAction, handleSubmit]);

  // Render a layout node recursively
  const renderLayoutNode = useCallback((node: LayoutNode): React.ReactNode => {
    const { type, children, components, props: layoutProps } = node;
    const key = `${type}-${Math.random().toString(36).slice(2)}`;

    // Render child components first
    const renderedComponents = components?.map(renderComponent) || [];

    // Then render children layout nodes
    const renderedChildren = children?.map(renderLayoutNode) || [];

    // Stack layout (vertical)
    if (type === 'stack') {
      return (
        <Box
          key={key}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: (layoutProps?.spacing as number) || 2,
            maxWidth: layoutProps?.maxWidth as string,
            padding: (layoutProps?.padding as number) || 0,
            mx: 'auto',
          }}
        >
          {renderedComponents}
          {renderedChildren}
        </Box>
      );
    }

    // Flex layout
    if (type === 'flex') {
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
          }}
        >
          {renderedComponents}
          {renderedChildren}
        </Box>
      );
    }

    // Grid layout
    if (type === 'grid') {
      return (
        <Grid container spacing={(layoutProps?.spacing as number) || 2} key={key}>
          {renderedComponents}
          {renderedChildren}
        </Grid>
      );
    }

    // Root layout
    if (type === 'root') {
      return (
        <Box key={key} sx={{ p: 3 }}>
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
  }, [renderComponent]);

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
      {renderLayoutNode(schema.layout)}

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