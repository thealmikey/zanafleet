import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/Layout';
import {
  getMessages,
  getThread,
  sendMessage,
  MessagePreview,
  MessageThread,
} from '../../services/messagingApi';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessagingPage(): React.ReactElement {
  const { token, user } = useAuth();

  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [replyText, setReplyText] = useState('');

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages(): Promise<void> {
      setIsLoadingList(true);
      setError(null);
      try {
        const result = await getMessages(token ?? undefined);
        if (!cancelled) {
          setMessages(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load messages');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSelectThread = useCallback(
    async (id: string): Promise<void> => {
      setIsLoadingThread(true);
      setError(null);
      try {
        const thread = await getThread(id, token ?? undefined);
        setSelectedThread(thread);
        // Update the preview in the list to mark as read
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, read: true } : m))
        );
      } catch (err) {
        setError('Failed to load thread');
      } finally {
        setIsLoadingThread(false);
      }
    },
    [token]
  );

  const handleBack = useCallback((): void => {
    setSelectedThread(null);
    setReplyText('');
  }, []);

  const handleSendReply = useCallback(async (): Promise<void> => {
    if (!selectedThread || !replyText.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      const updated = await sendMessage(
        selectedThread.id,
        { body: replyText.trim() },
        token ?? undefined
      );
      setSelectedThread(updated);
      setReplyText('');
      // Update message count in list
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedThread.id
            ? { ...m, replyCount: updated.messages.length, snippet: replyText.trim().slice(0, 100) }
            : m
        )
      );
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [selectedThread, replyText, token]);

  const renderInbox = (): React.ReactElement => {
    if (isLoadingList) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (messages.length === 0) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 4 }}
        >
          No messages
        </Typography>
      );
    }

    return (
      <List disablePadding>
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            {index > 0 && <Divider />}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => void handleSelectThread(message.id)}
                sx={{
                  bgcolor: message.read ? 'transparent' : 'action.hover',
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {getInitials(message.senderName)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: message.read ? 400 : 600 }}
                      >
                        {message.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(message.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                        sx={{
                          display: 'block',
                          fontWeight: message.read ? 400 : 500,
                        }}
                      >
                        {message.senderName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {message.snippet}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderThread = (): React.ReactElement => {
    if (isLoadingThread || !selectedThread) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton onClick={handleBack} aria-label="Back to inbox">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h2">
            {selectedThread.subject}
          </Typography>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            mb: 2,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 1,
          }}
        >
          <Stack spacing={2}>
            {selectedThread.messages.map((msg) => {
              const isCurrentUser = msg.senderId === user?.id;
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      bgcolor: isCurrentUser ? 'primary.main' : 'background.paper',
                      color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {msg.senderName}
                    </Typography>
                    <Typography variant="body2">{msg.body}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                      }}
                    >
                      {formatDate(msg.createdAt)}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendReply();
              }
            }}
            disabled={isSending}
            multiline
            maxRows={4}
          />
          <Button
            variant="contained"
            onClick={() => void handleSendReply()}
            disabled={isSending || !replyText.trim()}
            aria-label="Send reply"
          >
            {isSending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <DashboardLayout title="Messages">
      <Paper sx={{ p: 3, minHeight: 500 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {selectedThread ? renderThread() : renderInbox()}
      </Paper>
    </DashboardLayout>
  );
}
