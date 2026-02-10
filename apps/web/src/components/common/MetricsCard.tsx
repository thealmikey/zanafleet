import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
  loading?: boolean;
  ariaLabel?: string;
}

const COLOR_MAP: Record<NonNullable<MetricsCardProps['color']>, string> = {
  default: 'text.primary',
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
};

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }): React.ReactElement {
  switch (direction) {
    case 'up':
      return <TrendingUpIcon fontSize="small" color="success" aria-label="trending up" />;
    case 'down':
      return <TrendingDownIcon fontSize="small" color="error" aria-label="trending down" />;
    case 'flat':
    default:
      return <TrendingFlatIcon fontSize="small" color="action" aria-label="trending flat" />;
  }
}

export function MetricsCard({
  title,
  value,
  subtitle,
  icon,
  color = 'default',
  trend,
  loading = false,
  ariaLabel,
}: MetricsCardProps): React.ReactElement {
  const colorValue = COLOR_MAP[color];

  return (
    <Card
      role="region"
      aria-label={ariaLabel ?? `${title} metric`}
      sx={{ height: '100%' }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              component="h3"
              gutterBottom
            >
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} aria-label="Loading" />
            ) : (
              <Typography
                variant="h4"
                component="div"
                sx={{ color: colorValue, fontWeight: 600 }}
              >
                {value}
              </Typography>
            )}
            {subtitle && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {trend && !loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <TrendIcon direction={trend.direction} />
                {trend.label && (
                  <Typography variant="caption" color="text.secondary">
                    {trend.label}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          {icon && (
            <Box sx={{ color: colorValue, ml: 2 }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
