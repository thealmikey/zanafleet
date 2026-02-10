import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

import { DashboardLayout } from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { getHighestPriorityRole } from '../../utils/roleRouting';

type DeliveryLike = {
  deliveryId?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledDropoffTime?: string;
  [k: string]: unknown;
};

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getItemDateString(item: DeliveryLike): string {
  const raw = item.createdAt ?? item.updatedAt ?? item.scheduledDropoffTime;
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function HistoryCalendarPage(): React.ReactElement {
  const { user, token } = useAuth();

  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DeliveryLike[]>([]);

  const dashboardRole = getHighestPriorityRole(user?.roles);
  const effectiveRole: 'rider' | 'business' = dashboardRole === 'rider' ? 'rider' : 'business';

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory(): Promise<void> {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const encodedId = encodeURIComponent(user.id);
        const url =
          effectiveRole === 'rider'
            ? `${API_BASE_URL}/dashboard/rider/${encodedId}/deliveries/history?page=1&limit=200`
            : `${API_BASE_URL}/dashboard/business/${encodedId}/deliveries?page=1&limit=200`;

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.status}`);
        }

        const json = (await response.json()) as { data?: DeliveryLike[] };
        if (!cancelled) {
          setItems(json.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.id, token, effectiveRole]);

  const itemsByDate = React.useMemo(() => {
    const map = new Map<string, DeliveryLike[]>();
    for (const item of items) {
      const key = getItemDateString(item);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const handlePrevMonth = useCallback((): void => {
    setDisplayedMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (!isSameMonth(selectedDate, newMonth)) {
        setSelectedDate(newMonth);
      }
      return newMonth;
    });
  }, [selectedDate]);

  const handleNextMonth = useCallback((): void => {
    setDisplayedMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (!isSameMonth(selectedDate, newMonth)) {
        setSelectedDate(newMonth);
      }
      return newMonth;
    });
  }, [selectedDate]);

  const handleDayClick = useCallback((day: number): void => {
    setSelectedDate(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth(),
          day
        )
    );
  }, []);

  useEffect(() => {
    if (!isSameMonth(selectedDate, displayedMonth)) {
      setSelectedDate(startOfMonth(displayedMonth));
    }
  }, [displayedMonth, selectedDate]);

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayKey = toDateKey(today);
  const selectedKey = toDateKey(selectedDate);

  const selectedItems = itemsByDate.get(selectedKey) ?? [];

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const monthLabel = displayedMonth.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });

  return (
    <DashboardLayout title="History">
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
          }}
        >
          <Paper sx={{ p: 2, flex: '0 0 auto', width: { xs: '100%', md: 340 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Button size="small" onClick={handlePrevMonth} startIcon={<ChevronLeftIcon />}>
                Prev
              </Button>
              <Typography variant="subtitle1" fontWeight={600}>
                {monthLabel}
              </Typography>
              <Button size="small" onClick={handleNextMonth} endIcon={<ChevronRightIcon />}>
                Next
              </Button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
                textAlign: 'center',
              }}
            >
              {WEEKDAY_LABELS.map((label) => (
                <Typography
                  key={label}
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, py: 0.5 }}
                >
                  {label}
                </Typography>
              ))}

              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <Box key={`empty-${idx}`} />;
                }

                const cellKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = cellKey === todayKey;
                const isSelected = cellKey === selectedKey;
                const hasItems = itemsByDate.has(cellKey);

                return (
                  <Box
                    key={cellKey}
                    onClick={() => handleDayClick(day)}
                    sx={{
                      position: 'relative',
                      py: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      bgcolor: isSelected ? 'primary.main' : 'transparent',
                      color: isSelected ? 'primary.contrastText' : 'text.primary',
                      outline: isToday && !isSelected ? '2px solid' : 'none',
                      outlineColor: 'primary.light',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="body2">{day}</Typography>
                    {hasItems && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: isSelected ? 'primary.contrastText' : 'primary.main',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Paper sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {selectedItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No deliveries on this date.
              </Typography>
            ) : (
              <List disablePadding>
                {selectedItems.map((item, idx) => {
                  const itemId = item.deliveryId ?? item.id ?? `item-${idx}`;
                  const status = item.status ?? 'Unknown';
                  const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : '—';

                  return (
                    <ListItem key={itemId} divider={idx < selectedItems.length - 1}>
                      <ListItemText
                        primary={`ID: ${itemId}`}
                        secondary={`Status: ${status} | Created: ${dateStr}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Box>
      )}
    </DashboardLayout>
  );
}
