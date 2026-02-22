import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { SDUIRenderer } from '../components/SDUIRenderer';
import { DashboardLayout } from '../components/Layout';
import { getScreen, listScreens } from '../services/sduiApi';
import { UISchema, SDUIScreenList } from '../types/sdui.types';
import { useAuth } from '../hooks/useAuth';

export const SDUIPage: React.FC = () => {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<UISchema | null>(null);
  const [screenList, setScreenList] = useState<SDUIScreenList | null>(null);

  // Skip auth check in development mode for easier testing
  // In production, auth will be enforced based on screen metadata
  // Also bypass if URL has ?skipAuth=true parameter
  const isDevMode = process.env.NODE_ENV === 'development';
  const searchParams = new URLSearchParams(window.location.search);
  const skipAuth = searchParams.get('skipAuth') === 'true' || isDevMode;

  // Handle auth required - redirects to login with return URL
  // Only redirect when not skipping auth (dev mode or skipAuth param)
  const handleAuthRequired = (currentPath: string) => {
    if (skipAuth) {
      console.debug('[SDUIPage] Auth skip enabled: allowing access without auth');
      return;
    }
    navigate('/signin', { state: { from: { pathname: currentPath } }, replace: true });
  };

  // Fetch screen list for the menu
  useEffect(() => {
    const fetchScreenList = async () => {
      try {
        const list = await listScreens();
        setScreenList(list);
      } catch (err) {
        console.error('Failed to fetch screen list:', err);
      }
    };
    fetchScreenList();
  }, []);

  // Fetch specific screen
  useEffect(() => {
    const fetchScreen = async () => {
      if (!screenId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getScreen(screenId);
        // Debug log the schema for troubleshooting
        if (process.env.NODE_ENV === 'development') {
          console.debug('[SDUIPage] Loaded screen:', screenId, {
            version: data.version,
            screenId: data.screenId,
            metadata: data.metadata,
            hasLayout: !!data.layout,
            layoutType: data.layout?.type,
            componentsCount: data.layout?.components?.length || 0,
            actionsCount: data.actions?.length || 0,
            dataSourcesCount: data.data?.length || 0,
          });
        }
        setSchema(data);
      } catch (err) {
        console.error('[SDUIPage] Failed to load screen:', screenId, err);
      } finally {
        setLoading(false);
      }
    };

    fetchScreen();
  }, [screenId]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleActionComplete = (actionId: string, result: unknown) => {
    console.log('Action completed:', actionId, result);
  };

  // If no screen selected, show the list
  if (!screenId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Server-Driven UI Explorer
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select a screen to view its server-driven UI schema rendered in the browser.
        </Typography>

        {screenList?.screens ? (
          <Grid container spacing={3}>
            {screenList.screens.map((screen) => (
              <Grid item xs={12} sm={6} md={4} key={screen.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{screen.title}</Typography>
                    {screen.description && (
                      <Typography variant="body2" color="text.secondary">
                        {screen.description}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      ID: {screen.id}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => navigate(`/sdui/${screen.id}`)}
                    >
                      View Screen
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>Loading screens...</Typography>
        )}
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/sdui')}>
          Back to Screen List
        </Button>
      </Container>
    );
  }

  const useDashboardLayout = schema?.metadata.type === 'dashboard' || Boolean(screenId?.startsWith('dashboard.'));

  // Render the screen
  if (schema) {
    const content = (
      <Box>
        <Box sx={{ bgColor: '#f5f5f5', py: 1, px: 2, mb: 2 }}>
          <Button size="small" onClick={() => navigate('/sdui')}>
            ← Back to Screens
          </Button>
        </Box>
        <SDUIRenderer
          schema={schema}
          screenId={screenId}
          onNavigate={handleNavigate}
          onActionComplete={handleActionComplete}
          isAuthenticated={isAuthenticated}
          onAuthRequired={handleAuthRequired}
        />
      </Box>
    );

    return useDashboardLayout ? (
      <DashboardLayout title={schema.metadata.title}>{content}</DashboardLayout>
    ) : (
      content
    );
  }

  return null;
};

export default SDUIPage;
