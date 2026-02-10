import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  LocalShipping as DeliveriesIcon,
  People as RidersIcon,
  Assignment as QueueIcon,
  Timer as TimeIcon,
  MyLocation as LocationIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

import { DashboardLayout } from '../../components/Layout';
import {
  KPIGrid,
  ListWithPagination,
  GeoMap,
} from '../../components/common';
import type { KPIGridItem, GeoPoint } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  getOperatorMetrics,
  getOperatorAssignmentQueue,
  getOperatorCandidatesByArea,
  getOperatorDeliveryCandidates,
  getOperatorRouteHint,
  OperatorMetrics,
  AssignmentQueueItem,
  CandidateInfo,
  RouteHint,
  PaginationMeta,
} from '../../services/dashboardApi';
import { getNearbyRiders, RiderCandidate } from '../../services/geoApi';

type OperatorTab = 'metrics' | 'queue' | 'candidates' | 'route';

const TAB_PATHS: Record<OperatorTab, string> = {
  metrics: '/dashboard/operator',
  queue: '/dashboard/operator/queue',
  candidates: '/dashboard/operator/candidates',
  route: '/dashboard/operator/route',
};

function getTabFromPath(pathname: string): OperatorTab {
  if (pathname.includes('/queue')) return 'queue';
  if (pathname.includes('/candidates')) return 'candidates';
  if (pathname.includes('/route')) return 'route';
  return 'metrics';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString();
}

function getStatusColor(status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const s = status.toLowerCase();
  if (s.includes('assigned') || s.includes('completed')) return 'success';
  if (s.includes('pending') || s.includes('reassigning')) return 'warning';
  if (s.includes('failed') || s.includes('cancelled')) return 'error';
  return 'default';
}

function MetricsTab(): React.ReactElement {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<OperatorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    getOperatorMetrics(token)
      .then(setMetrics)
      .catch((err) => setError(err.message || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, [token]);

  const kpiItems: KPIGridItem[] = metrics
    ? [
        {
          title: 'Active Deliveries',
          value: metrics.activeDeliveries.toLocaleString(),
          icon: <DeliveriesIcon fontSize="large" />,
          color: 'primary',
          loading,
        },
        {
          title: 'Pending Assignments',
          value: metrics.pendingAssignments.toLocaleString(),
          icon: <QueueIcon fontSize="large" />,
          color: 'warning',
          loading,
        },
        {
          title: 'Available Riders',
          value: metrics.availableRiders.toLocaleString(),
          icon: <RidersIcon fontSize="large" />,
          color: 'success',
          loading,
        },
        {
          title: 'Avg Assignment Time',
          value: formatDuration(metrics.avgAssignmentTime),
          icon: <TimeIcon fontSize="large" />,
          color: 'secondary',
          loading,
        },
      ]
    : [
        { title: 'Active Deliveries', value: '-', loading: true },
        { title: 'Pending Assignments', value: '-', loading: true },
        { title: 'Available Riders', value: '-', loading: true },
        { title: 'Avg Assignment Time', value: '-', loading: true },
      ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Operations Overview
      </Typography>
      <Box sx={{ mb: 4 }}>
        <KPIGrid items={kpiItems} md={3} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" size="small" href="#/dashboard/operator/queue">
                  View Assignment Queue
                </Button>
                <Button variant="outlined" size="small" href="#/dashboard/operator/candidates">
                  Find Nearby Riders
                </Button>
                <Button variant="outlined" size="small" href="#/dashboard/operator/route">
                  Calculate Route
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  All systems operational. Real-time updates active.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function QueueTab(): React.ReactElement {
  const { token } = useAuth();
  const [queue, setQueue] = useState<AssignmentQueueItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getOperatorAssignmentQueue(token, { page, limit: 10 })
        .then((result) => {
          setQueue(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load assignment queue'))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    loadQueue(1);
  }, [loadQueue]);

  const handlePageChange = (page: number): void => {
    loadQueue(page);
  };

  const renderQueueItem = (item: AssignmentQueueItem): React.ReactNode => (
    <Card sx={{ width: '100%', mb: 1 }} data-testid={`queue-item-${item.deliveryId}`}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">{item.deliveryId}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`Priority: ${item.priority}`}
              size="small"
              color={item.priority >= 8 ? 'error' : item.priority >= 5 ? 'warning' : 'default'}
            />
            <Chip label={item.status} size="small" color={getStatusColor(item.status)} />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <strong>Pickup:</strong> {item.pickupAddress}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <strong>Dropoff:</strong> {item.dropoffAddress}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Attempts: {item.attempts}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Created: {formatDateTime(item.createdAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Assignment Queue
      </Typography>

      <ListWithPagination
        items={queue}
        renderItem={renderQueueItem}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No pending assignments"
        getItemKey={(item) => item.deliveryId}
      />
    </Box>
  );
}

type CandidateMode = 'area' | 'delivery';

const DEFAULT_LAT = -1.2864;
const DEFAULT_LNG = 36.8172;
const DEFAULT_RADIUS = 5000;
const DEFAULT_LIMIT = 10;

function CandidatesTab(): React.ReactElement {
  const { token } = useAuth();
  const [mode, setMode] = useState<CandidateMode>('area');
  const [candidates, setCandidates] = useState<CandidateInfo[]>([]);
  const [riderLocations, setRiderLocations] = useState<RiderCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lat, setLat] = useState<number>(DEFAULT_LAT);
  const [lng, setLng] = useState<number>(DEFAULT_LNG);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [deliveryId, setDeliveryId] = useState<string>('');

  const fetchCandidatesByArea = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [candidateData, riderData] = await Promise.all([
        getOperatorCandidatesByArea(token, { lat, lng, radius, limit }),
        getNearbyRiders({ lat, lng, radius, limit }),
      ]);
      setCandidates(candidateData);
      setRiderLocations(riderData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load candidates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, lat, lng, radius, limit]);

  const fetchCandidatesByDelivery = useCallback(async () => {
    if (!token || !deliveryId.trim()) {
      setError('Please enter a delivery ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const candidateData = await getOperatorDeliveryCandidates(token, deliveryId.trim(), { radius, limit });
      setCandidates(candidateData);
      setRiderLocations([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load candidates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, deliveryId, radius, limit]);

  const handleSearch = (): void => {
    if (mode === 'area') {
      void fetchCandidatesByArea();
    } else {
      void fetchCandidatesByDelivery();
    }
  };

  useEffect(() => {
    if (mode === 'area') {
      void fetchCandidatesByArea();
    }
  }, [mode, fetchCandidatesByArea]);

  const mapPoints: GeoPoint[] = riderLocations.map((r) => ({
    id: r.riderId,
    lat: r.lat,
    lng: r.lng,
    label: r.name,
  }));

  if (mapPoints.length === 0 && candidates.length > 0) {
    mapPoints.push({
      id: 'center',
      lat,
      lng,
      label: 'Search Center',
    });
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Candidate Discovery
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="candidate-mode-label">Search Mode</InputLabel>
              <Select
                labelId="candidate-mode-label"
                id="candidate-mode"
                value={mode}
                label="Search Mode"
                onChange={(e) => setMode(e.target.value as CandidateMode)}
              >
                <MenuItem value="area">By Area</MenuItem>
                <MenuItem value="delivery">By Delivery</MenuItem>
              </Select>
            </FormControl>

            {mode === 'area' ? (
              <>
                <TextField
                  label="Latitude"
                  type="number"
                  size="small"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || DEFAULT_LAT)}
                  inputProps={{ step: 0.0001 }}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Longitude"
                  type="number"
                  size="small"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || DEFAULT_LNG)}
                  inputProps={{ step: 0.0001 }}
                  sx={{ width: 120 }}
                />
              </>
            ) : (
              <TextField
                label="Delivery ID"
                size="small"
                value={deliveryId}
                onChange={(e) => setDeliveryId(e.target.value)}
                placeholder="e.g., del_queue_001"
                sx={{ width: 200 }}
              />
            )}

            <TextField
              label="Radius (m)"
              type="number"
              size="small"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10) || DEFAULT_RADIUS)}
              inputProps={{ min: 100, max: 50000 }}
              sx={{ width: 120 }}
              data-testid="radius-input"
            />
            <TextField
              label="Limit"
              type="number"
              size="small"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10) || DEFAULT_LIMIT)}
              inputProps={{ min: 1, max: 50 }}
              sx={{ width: 100 }}
              data-testid="limit-input"
            />

            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              startIcon={<LocationIcon />}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Candidates ({candidates.length})
              </Typography>
              {loading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading candidates...
                </Typography>
              ) : candidates.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No candidates found. Try adjusting your search parameters.
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {candidates.map((candidate) => (
                    <Card
                      key={candidate.riderId}
                      sx={{ mb: 1, bgcolor: 'grey.50' }}
                      data-testid={`candidate-item-${candidate.riderId}`}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2">{candidate.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {candidate.riderId}
                            </Typography>
                          </Box>
                          <Chip
                            label={`★ ${candidate.rating.toFixed(1)}`}
                            size="small"
                            color={candidate.rating >= 4.5 ? 'success' : 'default'}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Distance: {formatDistance(candidate.distance)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ETA: {formatDuration(candidate.eta)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Active: {candidate.activeDeliveries}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Rider Locations
              </Typography>
              {mapPoints.length > 0 ? (
                <GeoMap
                  points={mapPoints}
                  height={350}
                  ariaLabel="Map showing nearby rider locations"
                />
              ) : (
                <Box sx={{ p: 3, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No location data available. Search for candidates to see their locations.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function RouteTab(): React.ReactElement {
  const { token } = useAuth();
  const [routeHint, setRouteHint] = useState<RouteHint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [originLat, setOriginLat] = useState<number>(-1.2864);
  const [originLng, setOriginLng] = useState<number>(36.8172);
  const [destLat, setDestLat] = useState<number>(-1.2921);
  const [destLng, setDestLng] = useState<number>(36.8219);

  const fetchRouteHint = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getOperatorRouteHint(token, { originLat, originLng, destLat, destLng });
      setRouteHint(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate route';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, originLat, originLng, destLat, destLng]);

  const handleCalculate = (): void => {
    void fetchRouteHint();
  };

  const routePoints: GeoPoint[] = [
    { id: 'origin', lat: originLat, lng: originLng, label: 'Origin' },
    { id: 'destination', lat: destLat, lng: destLng, label: 'Destination' },
  ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Route Hint Calculator
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom>
                Origin
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Lat"
                  type="number"
                  size="small"
                  value={originLat}
                  onChange={(e) => setOriginLat(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.0001 }}
                  fullWidth
                />
                <TextField
                  label="Lng"
                  type="number"
                  size="small"
                  value={originLng}
                  onChange={(e) => setOriginLng(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.0001 }}
                  fullWidth
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom>
                Destination
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Lat"
                  type="number"
                  size="small"
                  value={destLat}
                  onChange={(e) => setDestLat(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.0001 }}
                />
                <TextField
                  label="Lng"
                  type="number"
                  size="small"
                  value={destLng}
                  onChange={(e) => setDestLng(parseFloat(e.target.value) || 0)}
                  inputProps={{ step: 0.0001 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
              <Button
                variant="contained"
                onClick={handleCalculate}
                disabled={loading}
                fullWidth
                sx={{ mt: { xs: 0, md: 2.5 } }}
              >
                {loading ? 'Calculating...' : 'Calculate'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Route Summary
              </Typography>
              {routeHint ? (
                <Box data-testid="route-summary">
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Distance
                        </Typography>
                        <Typography variant="h6" data-testid="route-distance">
                          {formatDistance(routeHint.distanceMeters)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Duration
                        </Typography>
                        <Typography variant="h6" data-testid="route-duration">
                          {formatDuration(routeHint.durationSeconds)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  {routeHint.polyline && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Encoded Polyline
                      </Typography>
                      <Box
                        sx={{
                          p: 1,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          wordBreak: 'break-all',
                          maxHeight: 100,
                          overflow: 'auto',
                        }}
                        data-testid="route-polyline"
                      >
                        {routeHint.polyline}
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ p: 3, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter origin and destination coordinates, then click Calculate to see route information.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Route Preview
              </Typography>
              <GeoMap
                points={routePoints}
                height={300}
                ariaLabel="Map showing route origin and destination"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function OperatorDashboardContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getTabFromPath(location.pathname);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: OperatorTab): void => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Operator Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Operator dashboard tabs">
          <Tab label="Metrics" value="metrics" id="operator-tab-metrics" />
          <Tab label="Queue" value="queue" id="operator-tab-queue" />
          <Tab label="Candidates" value="candidates" id="operator-tab-candidates" />
          <Tab label="Route" value="route" id="operator-tab-route" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="queue" element={<QueueTab />} />
        <Route path="candidates" element={<CandidatesTab />} />
        <Route path="route" element={<RouteTab />} />
        <Route path="*" element={<Navigate to="/dashboard/operator" replace />} />
      </Routes>
    </Container>
  );
}

export function OperatorDashboard(): React.ReactElement {
  return (
    <DashboardLayout title="Operator Dashboard">
      <OperatorDashboardContent />
    </DashboardLayout>
  );
}
