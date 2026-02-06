import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { useSignupWizard } from '../../../hooks/useSignupWizard';

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function isValidWalletAddress(address: string): boolean {
  return WALLET_ADDRESS_PATTERN.test(address);
}

export function WalletsStep(): React.ReactElement {
  const { formData, updateField, isLoading } = useSignupWizard();
  const [newWallet, setNewWallet] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setNewWallet(event.target.value);
      setInputError(null);
    },
    [],
  );

  const handleAddWallet = useCallback((): void => {
    const trimmedWallet = newWallet.trim();

    if (!trimmedWallet) {
      setInputError('Please enter a wallet address');
      return;
    }

    if (!isValidWalletAddress(trimmedWallet)) {
      setInputError('Please enter a valid Ethereum address (0x followed by 40 hex characters)');
      return;
    }

    if (formData.linkedWallets.includes(trimmedWallet)) {
      setInputError('This wallet address has already been added');
      return;
    }

    updateField('linkedWallets', [...formData.linkedWallets, trimmedWallet]);
    setNewWallet('');
    setInputError(null);
  }, [newWallet, formData.linkedWallets, updateField]);

  const handleRemoveWallet = useCallback(
    (walletToRemove: string): void => {
      updateField(
        'linkedWallets',
        formData.linkedWallets.filter((wallet) => wallet !== walletToRemove),
      );
    },
    [formData.linkedWallets, updateField],
  );

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAddWallet();
      }
    },
    [handleAddWallet],
  );

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Link Wallets
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect your cryptocurrency wallets to your account. This allows you to receive payments and interact with blockchain features.
      </Typography>

      <FormControl fullWidth error={!!inputError}>
        <FormLabel sx={{ mb: 1 }}>
          Wallet Addresses <Typography component="span" color="text.secondary">(optional)</Typography>
        </FormLabel>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            value={newWallet}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="0x1234...abcd"
            disabled={isLoading}
            error={!!inputError}
            fullWidth
            variant="outlined"
            size="small"
            inputProps={{
              'aria-label': 'New wallet address',
            }}
          />
          <Button
            variant="contained"
            onClick={handleAddWallet}
            disabled={isLoading || !newWallet.trim()}
            startIcon={<AddIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Box>
        {inputError && (
          <FormHelperText error>{inputError}</FormHelperText>
        )}
        <FormHelperText sx={{ mt: 1, ml: 0 }}>
          Enter Ethereum-compatible wallet addresses (0x format)
        </FormHelperText>
      </FormControl>

      {formData.linkedWallets.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Linked Wallets ({formData.linkedWallets.length})
          </Typography>
          <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            {formData.linkedWallets.map((wallet) => (
              <ListItem key={wallet}>
                <ListItemText
                  primary={truncateAddress(wallet)}
                  secondary={wallet}
                  primaryTypographyProps={{ fontFamily: 'monospace' }}
                  secondaryTypographyProps={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    sx: { wordBreak: 'break-all' },
                  }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label={`Remove wallet ${truncateAddress(wallet)}`}
                    onClick={() => handleRemoveWallet(wallet)}
                    disabled={isLoading}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {formData.linkedWallets.length === 0 && (
        <Box sx={{ mt: 3, textAlign: 'center', py: 3, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            No wallets linked yet. You can add wallets now or skip this step.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
