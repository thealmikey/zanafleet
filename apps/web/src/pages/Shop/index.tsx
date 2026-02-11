import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Grid,
    Paper,
    Stack,
    CircularProgress,
    Autocomplete,
    Alert,
    Card,
    CardContent,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { placeCustomerOrder } from '../../services/orderApi';
import { searchAddress, Address } from '../../services/geoApi';
// Mock business service or reuse dashboardApi if it has listBusinesses
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface LocationState {
    address: string | null;
    lat: number | null;
    lng: number | null;
    locationId: string | null;
}

interface Business {
    businessId: string;
    businessName: string;
    location: any;
}

export const ShopPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Order State
    const [itemDescription, setItemDescription] = useState('');
    const [itemPrice, setItemPrice] = useState<number>(0);
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');

    // Location State
    const [dropoff, setDropoff] = useState<LocationState>({ address: null, lat: null, lng: null, locationId: null });
    const [dropoffOptions, setDropoffOptions] = useState<Address[]>([]);

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                // Adjust endpoint as needed based on actual API
                const response = await axios.get(`${API_URL}/businesses`);
                setBusinesses(response.data.data || []);
            } catch (err) {
                console.error('Failed to fetch businesses');
            }
        };
        fetchBusinesses();
    }, []);

    const handleAddressSearch = async (query: string) => {
        if (query.length < 3) return;
        try {
            const results = await searchAddress(query);
            setDropoffOptions(results);
        } catch (err) {
            console.error('Address search failed', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!user || !user.activeWorkspaceId) {
            setError('You must be logged in.');
            return;
        }

        if (!selectedBusiness) {
            setError('Please select a business to shop from.');
            return;
        }

        if (!dropoff.lat && !dropoff.locationId) {
            setError('Please select a delivery location.');
            return;
        }

        setLoading(true);
        try {
            const result = await placeCustomerOrder({
                businessId: selectedBusiness.businessId,
                workspaceId: user.activeWorkspaceId,
                actorId: user.id,
                payerAccountId: user.id, // Simplified: using user.id as accountId
                payeeAccountId: selectedBusiness.businessId,
                items: [
                    {
                        itemId: 'custom-item',
                        description: itemDescription,
                        price: itemPrice,
                        quantity: 1
                    }
                ],
                pickup: {
                    locationId: selectedBusiness.location?.locationId || undefined,
                    label: selectedBusiness.businessName
                },
                dropoff: {
                    latitude: dropoff.lat ?? undefined,
                    longitude: dropoff.lng ?? undefined,
                    locationId: dropoff.locationId ?? undefined,
                    label: dropoff.address ?? 'Home',
                },
                recipientName,
                recipientPhone,
                paymentMethod,
            });

            setSuccess(`Order placed successfully! Order ID: ${result.orderId}`);
            // Reset
            setItemDescription('');
            setItemPrice(0);
            setRecipientName('');
            setRecipientPhone('');
            setDropoff({ address: null, lat: null, lng: null, locationId: null });
        } catch (err: any) {
            setError(err.message || 'Failed to place order.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Zana Shop
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={4}>
                {/* Business Selection */}
                <Grid item xs={12} md={4}>
                    <Typography variant="h5" gutterBottom>Select a Store</Typography>
                    <Stack spacing={2}>
                        {businesses.map((b) => (
                            <Card
                                key={b.businessId}
                                sx={{
                                    cursor: 'pointer',
                                    border: selectedBusiness?.businessId === b.businessId ? '2px solid' : 'none',
                                    borderColor: 'primary.main',
                                    '&:hover': { boxShadow: 6 }
                                }}
                                onClick={() => setSelectedBusiness(b)}
                            >
                                <CardContent>
                                    <Typography variant="h6">{b.businessName}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {b.location?.humanReadableName || 'Nearby Store'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                        {businesses.length === 0 && <Typography color="text.secondary">No businesses available.</Typography>}
                    </Stack>
                </Grid>

                {/* Ordering Form */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4, borderRadius: 2 }}>
                        <Typography variant="h5" gutterBottom>Your Order</Typography>
                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="What are you buying?"
                                        placeholder="e.g. 2kg Sugar, 1L Milk"
                                        value={itemDescription}
                                        onChange={(e) => setItemDescription(e.target.value)}
                                        required
                                        multiline
                                        rows={2}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Estimated Price (KES)"
                                        value={itemPrice || ''}
                                        onChange={(e) => setItemPrice(parseFloat(e.target.value))}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Payment Method</InputLabel>
                                        <Select
                                            value={paymentMethod}
                                            label="Payment Method"
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            <MenuItem value="MOBILE_MONEY">Mobile Money (M-Pesa)</MenuItem>
                                            <MenuItem value="CARD">Credit/Debit Card</MenuItem>
                                            <MenuItem value="WALLET_BALANCE">Zana Wallet</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>Delivery Destination</Typography>
                                    <Autocomplete
                                        freeSolo
                                        options={dropoffOptions}
                                        getOptionLabel={(option) => typeof option === 'string' ? option : option.formattedAddress}
                                        onInputChange={(_, value) => handleAddressSearch(value)}
                                        onChange={(_, value) => {
                                            if (value && typeof value !== 'string') {
                                                setDropoff({
                                                    address: value.formattedAddress,
                                                    lat: -1.2821, // Nairobi Mock
                                                    lng: 36.8119,
                                                    locationId: null
                                                });
                                            }
                                        }}
                                        renderInput={(params) => <TextField {...params} label="Search Delivery Address" required />}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Recipient Name"
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Recipient Phone"
                                        value={recipientPhone}
                                        onChange={(e) => setRecipientPhone(e.target.value)}
                                        required
                                    />
                                </Grid>

                                <Grid item xs={12} sx={{ mt: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        fullWidth
                                        disabled={loading || !selectedBusiness}
                                        sx={{ py: 2, fontSize: '1.1rem' }}
                                    >
                                        {loading ? <CircularProgress size={28} /> : 'Place Order & Pay'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};
