import React, { useState } from 'react';
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
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../hooks/useAuth';
import { requestDelivery } from '../../services/deliveryApi';
import { searchAddress, Address } from '../../services/geoApi';
import { searchCustomers, Customer } from '../../services/customerApi';

interface LocationState {
    address: string | null;
    lat: number | null;
    lng: number | null;
    locationId: string | null;
}

export const RequestDeliveryPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [scheduledTime, setScheduledTime] = useState<Date | null>(null);

    // Location State
    const [pickup, setPickup] = useState<LocationState>({ address: null, lat: null, lng: null, locationId: null });
    const [dropoff, setDropoff] = useState<LocationState>({ address: null, lat: null, lng: null, locationId: null });

    // Search State
    const [pickupOptions, setPickupOptions] = useState<Address[]>([]);
    const [dropoffOptions, setDropoffOptions] = useState<Address[]>([]);
    const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);

    const handleAddressSearch = async (query: string, setOptions: (options: Address[]) => void) => {
        if (query.length < 3) return;
        try {
            const results = await searchAddress(query);
            setOptions(results);
        } catch (err) {
            console.error('Address search failed', err);
        }
    };

    const handleCustomerSearch = async (query: string) => {
        if (!user?.activeWorkspaceId || query.length < 2) return;
        try {
            const results = await searchCustomers(user.activeWorkspaceId, query);
            setCustomerOptions(results);
        } catch (err) {
            console.error('Customer search failed', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!user || !user.activeWorkspaceId) {
            setError('You must be logged in and valid workspace to request a delivery.');
            return;
        }

        if (!pickup.lat && !pickup.locationId) { // Basic check, ideally check for lat/lng OR locationId
            setError('Please select a valid pickup location.');
            return;
        }
        if (!dropoff.lat && !dropoff.locationId) {
            setError('Please select a valid dropoff location.');
            return;
        }


        setLoading(true);
        try {
            const result = await requestDelivery({
                businessId: user.activeWorkspaceId, // Assuming workspace is business for now
                workspaceId: user.activeWorkspaceId,
                actorId: user.id,
                pickup: {
                    latitude: pickup.lat ?? undefined,
                    longitude: pickup.lng ?? undefined,
                    locationId: pickup.locationId ?? undefined,
                    label: pickup.address ?? 'Pickup',
                },
                dropoff: {
                    latitude: dropoff.lat ?? undefined,
                    longitude: dropoff.lng ?? undefined,
                    locationId: dropoff.locationId ?? undefined,
                    label: dropoff.address ?? 'Dropoff',
                },
                recipientName,
                recipientPhone,
                itemDescription,
                scheduledPickupTime: scheduledTime ?? undefined,
            });

            setSuccess(`Delivery requested successfully! Order ID: ${result.orderId}`);
            // Reset form
            setRecipientName('');
            setRecipientPhone('');
            setItemDescription('');
            setScheduledTime(null);
            setPickup({ address: null, lat: null, lng: null, locationId: null });
            setDropoff({ address: null, lat: null, lng: null, locationId: null });
        } catch (err: any) {
            setError(err.message || 'Failed to request delivery.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Request a Delivery
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Box component="form" onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            {/* Pickup & Dropoff */}
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>Pickup</Typography>
                                <Autocomplete
                                    freeSolo
                                    options={pickupOptions}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : option.formattedAddress}
                                    filterOptions={(x) => x}
                                    onInputChange={(_, newInputValue) => handleAddressSearch(newInputValue, setPickupOptions)}
                                    onChange={(_, value) => {
                                        if (value && typeof value !== 'string') {
                                            // Mocking coordinates for now as searchAddress mock doesn't return them yet in contracts
                                            // In real app, Address would have lat/lng
                                            setPickup({
                                                address: value.formattedAddress,
                                                lat: -1.2921, // Nairobi Mock
                                                lng: 36.8219,
                                                locationId: null
                                            });
                                        }
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Search Pickup Address" required />}
                                />
                                {/* Fallback manual entry for lat/lng if needed, checking if address is selected */}
                                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <TextField
                                        label="Lat"
                                        size="small"
                                        type="number"
                                        value={pickup.lat || ''}
                                        onChange={(e) => setPickup({ ...pickup, lat: parseFloat(e.target.value) })}
                                        helperText="Manual Override"
                                    />
                                    <TextField
                                        label="Lng"
                                        size="small"
                                        type="number"
                                        value={pickup.lng || ''}
                                        onChange={(e) => setPickup({ ...pickup, lng: parseFloat(e.target.value) })}
                                    />
                                </Stack>

                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>Dropoff</Typography>
                                <Autocomplete
                                    freeSolo
                                    options={dropoffOptions}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : option.formattedAddress}
                                    filterOptions={(x) => x}
                                    onInputChange={(_, newInputValue) => handleAddressSearch(newInputValue, setDropoffOptions)}
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
                                    renderInput={(params) => <TextField {...params} label="Search Dropoff Address" required />}
                                />
                                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    <TextField
                                        label="Lat"
                                        size="small"
                                        type="number"
                                        value={dropoff.lat || ''}
                                        onChange={(e) => setDropoff({ ...dropoff, lat: parseFloat(e.target.value) })}
                                        helperText="Manual Override"
                                    />
                                    <TextField
                                        label="Lng"
                                        size="small"
                                        type="number"
                                        value={dropoff.lng || ''}
                                        onChange={(e) => setDropoff({ ...dropoff, lng: parseFloat(e.target.value) })}
                                    />
                                </Stack>
                            </Grid>

                            {/* Recipient Details */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Recipient Details</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    freeSolo
                                    options={customerOptions}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.phoneNumber})`}
                                    onInputChange={(_, value) => {
                                        setRecipientName(value);
                                        handleCustomerSearch(value);
                                    }}
                                    onChange={(_, value) => {
                                        if (value && typeof value !== 'string') {
                                            setRecipientName(value.name);
                                            setRecipientPhone(value.phoneNumber);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Recipient Name"
                                            required
                                            placeholder="Search existing or type new"
                                        />
                                    )}
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

                            {/* Item Details */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Item Details</Typography>
                                <TextField
                                    fullWidth
                                    label="Item Description"
                                    value={itemDescription}
                                    onChange={(e) => setItemDescription(e.target.value)}
                                    required
                                    multiline
                                    rows={2}
                                />
                            </Grid>

                            {/* Schedule */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Schedule (Optional)</Typography>
                                <DateTimePicker
                                    label="Pickup Time"
                                    value={scheduledTime}
                                    onChange={(newValue) => setScheduledTime(newValue)}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    fullWidth
                                    disabled={loading}
                                >
                                    {loading ? <CircularProgress size={24} /> : 'Request Delivery'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Container>
        </LocalizationProvider>
    );
};
