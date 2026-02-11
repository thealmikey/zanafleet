import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';

export interface DeliveryCardProps {
  deliveryId: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  assignedRider?: string | null;
  createdAt?: Date;
  completedAt?: Date | null;
  estimatedEarnings?: number;
  onClick?: (id: string) => void;
}

function getStatusColor(status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered') || statusLower.includes('completed')) return 'success';
  if (statusLower.includes('cancelled') || statusLower.includes('failed')) return 'error';
  if (statusLower.includes('pending') || statusLower.includes('assigned')) return 'warning';
  if (statusLower.includes('transit') || statusLower.includes('picked')) return 'primary';
  return 'default';
}

function formatDate(date: Date | undefined | null): string {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

export function DeliveryCard({
  deliveryId,
  status,
  pickupAddress,
  dropoffAddress,
  recipientName,
  recipientPhone,
  assignedRider,
  createdAt,
  completedAt,
  estimatedEarnings,
  onClick,
}: DeliveryCardProps): React.ReactElement {
  const cardAriaLabel = `Delivery ${deliveryId}, status ${status}`;

  const content = (
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          {deliveryId}
        </Typography>
        <Chip
          label={status}
          size="small"
          color={getStatusColor(status)}
          aria-label={`Status: ${status}`}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <LocationIcon fontSize="small" color="primary" />
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Pickup
          </Typography>
          <Typography variant="body2">{pickupAddress}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <LocationIcon fontSize="small" color="error" />
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Dropoff
          </Typography>
          <Typography variant="body2">{dropoffAddress}</Typography>
        </Box>
      </Box>

      {(recipientName || recipientPhone) && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <PersonIcon fontSize="small" color="action" />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Customer
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {recipientName || 'Customer'}
            </Typography>
            {recipientPhone && (
              <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 500 }}>
                {recipientPhone}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {assignedRider && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {assignedRider}
          </Typography>
        </Box>
      )}

      {typeof estimatedEarnings === 'number' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <MoneyIcon fontSize="small" color="success" />
          <Typography variant="body2" color="success.main">
            KES {estimatedEarnings.toLocaleString()}
          </Typography>
        </Box>
      )}

      {(createdAt || completedAt) && (
        <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          {createdAt && (
            <Typography variant="caption" color="text.secondary" display="block">
              Created: {formatDate(createdAt)}
            </Typography>
          )}
          {completedAt && (
            <Typography variant="caption" color="text.secondary" display="block">
              Completed: {formatDate(completedAt)}
            </Typography>
          )}
        </Box>
      )}
    </CardContent>
  );

  if (onClick) {
    return (
      <Card aria-label={cardAriaLabel}>
        <CardActionArea onClick={() => onClick(deliveryId)}>
          {content}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card aria-label={cardAriaLabel}>
      {content}
    </Card>
  );
}
