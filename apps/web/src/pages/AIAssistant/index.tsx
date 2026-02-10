import React, { useCallback, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as AssistantIcon,
  Send as SendIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/Layout';
import { assist } from '../../services/aiApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AIAssistantPage(): React.ReactElement {
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async (): Promise<void> => {
    const prompt = inputValue.trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await assist(prompt, undefined, token ?? undefined);
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        createdAt: new Date(response.createdAt),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, token]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return (
    <DashboardLayout title="AI Assistant">
      <Paper
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 140px)',
          minHeight: 400,
          maxHeight: 800,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 3,
            bgcolor: 'grey.50',
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
              }}
            >
              <AssistantIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                AI Assistant
              </Typography>
              <Typography variant="body2" textAlign="center">
                Ask me anything about ZanaFleet.
                <br />
                I'm here to help!
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                      width: 36,
                      height: 36,
                    }}
                  >
                    {msg.role === 'user' ? <PersonIcon /> : <AssistantIcon />}
                  </Avatar>
                  <Box
                    sx={{
                      maxWidth: '70%',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      boxShadow: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                      }}
                    >
                      {formatTime(msg.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {isLoading && (
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                    <AssistantIcon />
                  </Avatar>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                    }}
                  >
                    <CircularProgress size={20} />
                  </Box>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {error && (
          <Typography color="error" sx={{ px: 3, py: 1 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              multiline
              maxRows={4}
              autoFocus
            />
            <Button
              variant="contained"
              onClick={() => void handleSend()}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            </Button>
          </Box>
        </Box>
      </Paper>
    </DashboardLayout>
  );
}
