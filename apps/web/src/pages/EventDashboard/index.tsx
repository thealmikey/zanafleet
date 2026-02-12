import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Button,
} from '@mui/material';
import { Event, LocalShipping, Person, AttachMoney, CheckCircle, AccessTime } from '@mui/icons-material';

interface BundleDetails {
    bundleId: string;
    bundleName: string;
    period: { start: Date; end: Date };
    budget: number;
    actual: number;
    trips: any[];
    summary: {
        totalTrips: number;
        completedTrips: number;
        inProgressTrips: number;
        totalCost: number;
    };
}

export default function EventDashboard() {
    const [bundle, setBundle] = useState<BundleDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const bundleId = 'bundle-nairobi-music-fest-2026'; // From seed data

    useEffect(() => {
        // Fetch bundle details
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/bundles/${bundleId}`)
            .then(res => res.json())
            .then(data => {
                setBundle(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch bundle:', err);
                setLoading(false);
            });
    }, [bundleId]);

    if (loading) {
        return <LinearProgress />;
    }

    if (!bundle) {
        return (
            <Container sx={{ py: 4 }}>
                <Typography variant="h5" color="error">Bundle not found</Typography>
            </Container>
        );
    }

    const progressPercent = (bundle.summary.completedTrips / bundle.summary.totalTrips) * 100;
    const budgetUsedPercent = (bundle.actual / bundle.budget) * 100;

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Event sx={{ fontSize: 48, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold">{bundle.bundleName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {new Date(bundle.period.start).toLocaleDateString()} - {new Date(bundle.period.end).toLocaleDateString()}
                    </Typography>
                </Box>
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <LocalShipping sx={{ fontSize: 40, color: 'info.main' }} />
                        <Typography variant="h5" fontWeight="bold">{bundle.summary.totalTrips}</Typography>
                        <Typography variant="caption" color="text.secondary">Total Trips</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
                        <Typography variant="h5" fontWeight="bold">{bundle.summary.completedTrips}</Typography>
                        <Typography variant="caption" color="text.secondary">Completed</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <AccessTime sx={{ fontSize: 40, color: 'warning.main' }} />
                        <Typography variant="h5" fontWeight="bold">{bundle.summary.inProgressTrips}</Typography>
                        <Typography variant="caption" color="text.secondary">In Progress</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <AttachMoney sx={{ fontSize: 40, color: 'primary.main' }} />
                        <Typography variant="h5" fontWeight="bold">KES {bundle.summary.totalCost.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary">Total Cost</Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Progress Bars */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>Trip Progress</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            sx={{ height: 10, borderRadius: 5, mb: 1 }}
                        />
                        <Typography variant="caption">{progressPercent.toFixed(0)}% Complete</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>Budget Utilization</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(budgetUsedPercent, 100)}
                            color={budgetUsedPercent > 100 ? 'error' : 'primary'}
                            sx={{ height: 10, borderRadius: 5, mb: 1 }}
                        />
                        <Typography variant="caption">
                            KES {bundle.actual.toLocaleString()} / {bundle.budget.toLocaleString()}
                            {budgetUsedPercent > 100 && ' (Over Budget!)'}
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Trips Table */}
            <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">All Trips</Typography>
                    <Button variant="outlined" size="small">Generate Invoice</Button>
                </Box>
                <Paper sx={{ overflow: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Asset</TableCell>
                                <TableCell>Operator ID</TableCell>
                                <TableCell>Start Time</TableCell>
                                <TableCell>End Time</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bundle.trips.map((trip) => (
                                <TableRow key={trip.tripId}>
                                    <TableCell>{trip.assetName}</TableCell>
                                    <TableCell>
                                        <Person sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                        {trip.operatorId.substring(0, 8)}...
                                    </TableCell>
                                    <TableCell>{new Date(trip.startTime).toLocaleString()}</TableCell>
                                    <TableCell>{trip.endTime ? new Date(trip.endTime).toLocaleString() : '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={trip.status}
                                            size="small"
                                            color={trip.status === 'COMPLETED' ? 'success' : 'warning'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">KES {trip.earnings?.toLocaleString() || '0'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Card>
        </Container>
    );
}
