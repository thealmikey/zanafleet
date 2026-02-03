import React from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  RocketLaunch as RocketIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps): React.ReactElement {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color: 'primary.main', mb: 2 }}>{icon}</Box>
      <Typography variant="h6" component="h3" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );
}

export function HomePage(): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 6, sm: 8, md: 12 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, textAlign: 'center' }}
          >
            Welcome to ZanaFleet
          </Typography>
          <Typography
            variant={isMobile ? 'body1' : 'h6'}
            sx={{
              textAlign: 'center',
              mb: 4,
              opacity: 0.9,
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Streamline your fleet management with our powerful, event-driven platform.
            Built for scale, designed for simplicity.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isAuthenticated ? (
              <Button
                component={RouterLink}
                to="/dashboard"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                    px: 4,
                    py: 1.5,
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  Get Started
                </Button>
                <Button
                  component={RouterLink}
                  to="/signin"
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                    px: 4,
                    py: 1.5,
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  Sign In
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{ textAlign: 'center', mb: 6, fontWeight: 600 }}
        >
          Why Choose ZanaFleet?
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <FeatureCard
              icon={<SpeedIcon sx={{ fontSize: 48 }} />}
              title="Real-Time Visibility"
              description="Monitor your entire fleet in real-time with our advanced tracking and event-driven architecture."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard
              icon={<SecurityIcon sx={{ fontSize: 48 }} />}
              title="Enterprise Security"
              description="Bank-grade security with role-based access control and comprehensive audit trails."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard
              icon={<RocketIcon sx={{ fontSize: 48 }} />}
              title="Scalable Platform"
              description="Built to grow with your business, from small teams to enterprise-scale operations."
            />
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'grey.100', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="sm">
          <Typography
            variant="h5"
            component="h2"
            sx={{ textAlign: 'center', mb: 2, fontWeight: 600 }}
          >
            Ready to get started?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 4 }}
          >
            Join thousands of businesses already using ZanaFleet to manage their operations.
          </Typography>
          {!isAuthenticated && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                component={RouterLink}
                to="/signup"
                variant="contained"
                size="large"
                sx={{ px: 6, py: 1.5 }}
              >
                Create Free Account
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          bgcolor: 'grey.900',
          color: 'grey.400',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            &copy; {new Date().getFullYear()} ZanaFleet. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
