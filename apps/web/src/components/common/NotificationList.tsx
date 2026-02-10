import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  createdAt: Date;
  type?: 'info' | 'warning' | 'success' | 'error';
  read?: boolean;
}

export interface NotificationListProps {
  items: NotificationItem[];
  onItemClick?: (id: string) => void;
}

function getNotificationIcon(type: NotificationItem['type']): React.ReactElement {
  switch (type) {
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'success':
      return <SuccessIcon color="success" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'info':
    default:
      return <InfoIcon color="info" />;
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleString();
}

export function NotificationList({
  items,
  onItemClick,
}: NotificationListProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', py: 4 }}
        role="status"
      >
        No notifications
      </Typography>
    );
  }

  return (
    <Box aria-live="polite" aria-atomic="false">
      <List role="list">
        {items.map((item) => {
          const content = (
            <>
              <ListItemIcon>{getNotificationIcon(item.type)}</ListItemIcon>
              <ListItemText
                primary={item.title}
                secondary={
                  <>
                    {item.message && (
                      <Typography variant="body2" component="span" display="block">
                        {item.message}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(item.createdAt)}
                    </Typography>
                  </>
                }
              />
            </>
          );

          return (
            <ListItem
              key={item.id}
              disablePadding
              sx={{
                bgcolor: item.read ? 'transparent' : 'action.hover',
              }}
            >
              {onItemClick ? (
                <ListItemButton
                  onClick={() => onItemClick(item.id)}
                  aria-label={`Notification: ${item.title}`}
                >
                  {content}
                </ListItemButton>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, width: '100%' }}>
                  {content}
                </Box>
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
