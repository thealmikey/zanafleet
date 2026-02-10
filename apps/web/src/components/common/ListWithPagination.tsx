import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import {
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';

export interface ListWithPaginationProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyText?: string;
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  getItemKey?: (item: T) => React.Key;
}

export function ListWithPagination<T>({
  items,
  renderItem,
  emptyText = 'No items to display',
  page,
  totalPages,
  total,
  onPageChange,
  loading = false,
  getItemKey,
}: ListWithPaginationProps<T>): React.ReactElement {
  const handleFirst = (): void => onPageChange(1);
  const handlePrev = (): void => onPageChange(Math.max(1, page - 1));
  const handleNext = (): void => onPageChange(Math.min(totalPages, page + 1));
  const handleLast = (): void => onPageChange(totalPages);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress aria-label="Loading list" />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', py: 4 }}
        role="status"
      >
        {emptyText}
      </Typography>
    );
  }

  return (
    <Box>
      <List role="list">
        {items.map((item, index) => (
          <ListItem key={getItemKey ? getItemKey(item) : index} disablePadding>
            {renderItem(item, index)}
          </ListItem>
        ))}
      </List>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          mt: 2,
          py: 1,
        }}
      >
        <IconButton
          onClick={handleFirst}
          disabled={page <= 1}
          aria-label="First page"
          size="small"
        >
          <FirstPageIcon />
        </IconButton>
        <IconButton
          onClick={handlePrev}
          disabled={page <= 1}
          aria-label="Previous page"
          size="small"
        >
          <PrevIcon />
        </IconButton>

        <Typography variant="body2" sx={{ mx: 2 }}>
          Page {page} of {totalPages}
          {typeof total === 'number' && ` (${total} total)`}
        </Typography>

        <IconButton
          onClick={handleNext}
          disabled={page >= totalPages}
          aria-label="Next page"
          size="small"
        >
          <NextIcon />
        </IconButton>
        <IconButton
          onClick={handleLast}
          disabled={page >= totalPages}
          aria-label="Last page"
          size="small"
        >
          <LastPageIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
