import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';

// Local type definitions
interface Address {
  formattedAddress: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

interface LocationSuggestion {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  locality?: string;
  region?: string;
  country?: string;
  placeType?: 'address' | 'city' | 'region' | 'country';
}

interface VehicleRecommendation {
  vehicleType: string;
  vehicleName: string;
  capacity: string;
  recommendedFor: string[];
  estimatedCapacityCubicMeters: number;
  imageUrl?: string;
  features?: string[];
}

interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface PricingFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface MovingQuote {
  quoteId: string;
  vehicles: VehicleRecommendation[];
  estimatedPrice: { min: number; max: number; currency: string };
  estimatedDuration: { minMinutes: number; maxMinutes: number };
  distanceKilometers: number;
  availableSlots: AvailableSlot[];
  pricingFactors: PricingFactor[];
  validUntil: string;
}

// API functions
async function searchAddress(query: string): Promise<Address[]> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
  const response = await fetch(`${API_BASE_URL}/geo/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Address search failed');
  return response.json();
}

async function calculateQuote(request: {
  movingFrom: LocationSuggestion;
  movingTo: LocationSuggestion;
  currentHouseSize: string;
  destinationHouseSize: string;
}): Promise<MovingQuote> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
  const response = await fetch(`${API_BASE_URL}/mover/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Quote calculation failed');
  return response.json();
}

// House size options
const houseSizeOptions: { value: string; label: string; icon: string }[] = [
  { value: 'studio', label: 'Studio', icon: '🏢' },
  { value: '1br', label: '1 Bedroom', icon: '🏠' },
  { value: '2br', label: '2 Bedrooms', icon: '🏡' },
  { value: '3br', label: '3 Bedrooms', icon: '🏘️' },
  { value: '4br+', label: '4+ Bedrooms', icon: '🏚️' },
];

interface LocationState {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  locality?: string;
  region?: string;
  country?: string;
}

export const MoversHomePage: React.FC = () => {
  const [movingFrom, setMovingFrom] = useState<LocationState | null>(null);
  const [movingTo, setMovingTo] = useState<LocationState | null>(null);
  const [currentSize, setCurrentSize] = useState<string | null>(null);
  const [destinationSize, setDestinationSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromOptions, setFromOptions] = useState<Address[]>([]);
  const [toOptions, setToOptions] = useState<Address[]>([]);
  const [quote, setQuote] = useState<MovingQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddressSearch = useCallback(async (query: string): Promise<Address[]> => {
    if (query.length < 3) return [];
    try {
      const results = await searchAddress(query);
      return results;
    } catch {
      return [];
    }
  }, []);

  const handleFromInputChange = useCallback(async (_event: React.SyntheticEvent, value: string) => {
    const results = await handleAddressSearch(value);
    setFromOptions(results);
  }, [handleAddressSearch]);

  const handleToInputChange = useCallback(async (_event: React.SyntheticEvent, value: string) => {
    const results = await handleAddressSearch(value);
    setToOptions(results);
  }, [handleAddressSearch]);

  const handleFromSelect = useCallback((_event: React.SyntheticEvent, value: string | Address | null) => {
    if (value && typeof value !== 'string') {
      setMovingFrom({
        placeId: value.formattedAddress,
        formattedAddress: value.formattedAddress,
        latitude: -1.2921,
        longitude: 36.8219,
        locality: value.city,
        region: value.region,
        country: value.country,
      });
    } else {
      setMovingFrom(null);
    }
  }, []);

  const handleToSelect = useCallback((_event: React.SyntheticEvent, value: string | Address | null) => {
    if (value && typeof value !== 'string') {
      setMovingTo({
        placeId: value.formattedAddress,
        formattedAddress: value.formattedAddress,
        latitude: -1.2921,
        longitude: 36.8219,
        locality: value.city,
        region: value.region,
        country: value.country,
      });
    } else {
      setMovingTo(null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!movingFrom || !movingTo || !currentSize || !destinationSize) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await calculateQuote({
        movingFrom,
        movingTo,
        currentHouseSize: currentSize,
        destinationHouseSize: destinationSize,
      });
      setQuote(result);
    } catch {
      setError('Failed to fetch quotes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [movingFrom, movingTo, currentSize, destinationSize]);

  const isFormValid = useMemo(() => {
    return Boolean(movingFrom && movingTo && currentSize && destinationSize);
  }, [movingFrom, movingTo, currentSize, destinationSize]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Hero Section */}
      <Box sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', py: { xs: 6, md: 10 }, px: 2 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>Find Reliable Movers</Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>Get instant quotes and book your move in minutes</Typography>

          {/* Location Inputs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, bgcolor: 'white' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Moving From</Typography>
                <Autocomplete
                  freeSolo
                  options={fromOptions}
                  getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.formattedAddress}
                  filterOptions={(x) => x}
                  onInputChange={handleFromInputChange}
                  onChange={handleFromSelect}
                  renderInput={(params) => <TextField {...params} placeholder="Enter origin address" variant="outlined" fullWidth size="small" />}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', fontSize: '1.2rem' }}>⇄</Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, bgcolor: 'white' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Moving To</Typography>
                <Autocomplete
                  freeSolo
                  options={toOptions}
                  getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.formattedAddress}
                  filterOptions={(x) => x}
                  onInputChange={handleToInputChange}
                  onChange={handleToSelect}
                  renderInput={(params) => <TextField {...params} placeholder="Enter destination address" variant="outlined" fullWidth size="small" />}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* House Size Selectors */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'white' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Current Home Size</Typography>
                <ToggleButtonGroup value={currentSize} exclusive onChange={(_, v) => v && setCurrentSize(v)} fullWidth size="small">
                  {houseSizeOptions.map((opt) => <ToggleButton key={opt.value} value={opt.value}>{opt.icon} {opt.label}</ToggleButton>)}
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Destination Home Size</Typography>
                <ToggleButtonGroup value={destinationSize} exclusive onChange={(_, v) => v && setDestinationSize(v)} fullWidth size="small">
                  {houseSizeOptions.map((opt) => <ToggleButton key={opt.value} value={opt.value}>{opt.icon} {opt.label}</ToggleButton>)}
                </ToggleButtonGroup>
              </Grid>
            </Grid>
          </Paper>

          {/* CTA Button */}
          <Button variant="contained" size="large" onClick={handleSubmit} disabled={!isFormValid || isLoading}
            sx={{ bgcolor: 'white', color: 'primary.main', px: 6, py: 1.5, fontSize: '1.1rem', fontWeight: 600, '&:hover': { bgcolor: 'grey.100' } }}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Find Movers'}
          </Button>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Container>
      </Box>

      {/* Results Section */}
      {quote && (
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>Available Options</Typography>
          <Paper sx={{ p: 3, mb: 4, bgcolor: '#e3f2fd' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Estimated Distance</Typography>
                <Typography variant="h5" fontWeight={600}>{quote.distanceKilometers.toFixed(1)} km</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Estimated Time</Typography>
                <Typography variant="h5" fontWeight={600}>{quote.estimatedDuration.minMinutes}-{quote.estimatedDuration.maxMinutes} mins</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Estimated Price</Typography>
                <Typography variant="h5" fontWeight={600} color="primary.main">KES {quote.estimatedPrice.min.toLocaleString()} - {quote.estimatedPrice.max.toLocaleString()}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>Recommended Vehicles</Typography>
          <Grid container spacing={3}>
            {quote.vehicles.map((vehicle, idx) => (
              <Grid item xs={12} md={6} lg={4} key={idx}>
                <Card sx={{ height: '100%' }}>
                  <CardMedia component="div" sx={{ height: 140, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🚛</CardMedia>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{vehicle.vehicleName}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{vehicle.capacity}</Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      {vehicle.recommendedFor.map((size) => <Chip key={size} label={size} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                    </Box>
                    {vehicle.features && vehicle.features.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {vehicle.features.map((feat, i) => <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block' }}>• {feat}</Typography>)}
                      </Box>
                    )}
                    <Button variant="outlined" fullWidth>Select This Vehicle</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {quote.availableSlots.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>Available Time Slots</Typography>
              <Grid container spacing={2}>
                {quote.availableSlots.slice(0, 6).map((slot, idx) => (
                  <Grid item xs={6} sm={4} md={2} key={idx}>
                    <Paper sx={{ p: 2, textAlign: 'center', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="subtitle2">{new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Typography>
                      <Typography variant="body2" color="text.secondary">{slot.startTime} - {slot.endTime}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {quote.pricingFactors.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>What's Included</Typography>
              <Grid container spacing={2}>
                {quote.pricingFactors.map((factor, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={factor.impact === 'positive' ? '✓' : factor.impact === 'negative' ? '!' : '•'} color={factor.impact === 'positive' ? 'success' : factor.impact === 'negative' ? 'warning' : 'default'} size="small" />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{factor.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{factor.description}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            Quote valid until: {new Date(quote.validUntil).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Container>
      )}
    </Box>
  );
};

export default MoversHomePage;
