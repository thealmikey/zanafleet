import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    LinearProgress,
    Paper,
    Button,
    Avatar,
} from '@mui/material';
import {
    Assessment,
    TrendingUp,
    LocalShipping,
    Person,
    MoreVert,
    Add as AddIcon,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/Layout';
import { KPIGrid } from '../../components/common';

const FleetDashboard: React.FC = () => {
    const [loading] = useState(false);

    // Mock data for the demonstration
    const stats = [
        { title: 'Fleet Valuation', value: 'KES 24.5M', icon: <Assessment />, color: 'primary' as const },
        { title: 'Monthly ROI', value: '+12.4%', icon: <TrendingUp />, color: 'success' as const },
        { title: 'Active Assets', value: '18 / 22', icon: <LocalShipping />, color: 'secondary' as const },
        { title: 'Active Operators', value: '15 / 18', icon: <Person />, color: 'warning' as const },
    ];

    const assets = [
        { id: '1', name: 'Isuzu FRR - KDL 123X', utilization: 85, status: 'Active', roi: '+15%' },
        { id: '2', name: 'Scania R450 - KDM 444A', utilization: 92, status: 'Active', roi: '+18%' },
        { id: '3', name: 'Caterpillar 320D', utilization: 45, status: 'Maintenance', roi: '-2%' },
        { id: '4', name: 'Warehouse A - Embakasi', utilization: 98, status: 'Active', roi: '+22%' },
    ];

    return (
        <DashboardLayout title="Fleet Overview">
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {/* Hero Section with Glassmorphism */}
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                        borderRadius: 4,
                        p: 4,
                        mb: 4,
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <Box sx={{ position: 'relative', zIndex: 2 }}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            Welcome back, Fleet Owner
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, mb: 3 }}>
                            Your fleet is performing 15% better than last month. 4 assets require maintenance attention.
                        </Typography>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<AddIcon />}
                            sx={{ borderRadius: 2, px: 3 }}
                        >
                            Add New Asset
                        </Button>
                    </Box>
                    {/* Abstract background elements */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -50,
                            right: -50,
                            width: 200,
                            height: 200,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            borderRadius: '50%',
                        }}
                    />
                </Box>

                {/* KPI Grid */}
                <Box sx={{ mb: 4 }}>
                    <KPIGrid items={stats.map(s => ({ ...s, loading }))} />
                </Box>

                <Grid container spacing={3}>
                    {/* Active Projects / Bundles */}
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 3, mb: 3, bgcolor: 'background.paper' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>Active Projects (Bundles)</Typography>
                                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
                                    {[
                                        { name: 'Office Relocation #77', assets: 3, status: 'In Progress' },
                                        { name: 'Wholesale Run #91', assets: 1, status: 'Active' },
                                        { name: 'Cold Chain Delivery #12', assets: 2, status: 'Pending' },
                                    ].map((p, i) => (
                                        <Paper key={i} sx={{ p: 2, minWidth: 200, borderRadius: 2, border: '1px solid #ddd' }}>
                                            <Typography variant="subtitle2" fontWeight="bold">{p.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{p.assets} Assets Involved</Typography>
                                            <Box sx={{ mt: 1 }}>
                                                <Chip label={p.status} size="small" color="primary" variant="outlined" />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Asset Performance Table/List */}
                    <Grid item xs={12} md={8}>
                        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                    <Typography variant="h6" fontWeight="bold">Asset Performance</Typography>
                                    <Button size="small">View All</Button>
                                </Box>
                                {assets.map((asset) => (
                                    <Box
                                        key={asset.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            p: 2,
                                            mb: 2,
                                            bgcolor: 'background.default',
                                            borderRadius: 2,
                                            border: '1px solid rgba(0,0,0,0.05)',
                                        }}
                                    >
                                        <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                                            <LocalShipping />
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle2" fontWeight="bold">{asset.name}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                <Typography variant="caption" sx={{ minWidth: 80 }}>Utilization</Typography>
                                                <Box sx={{ width: '100%', mr: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={asset.utilization}
                                                        sx={{ height: 6, borderRadius: 3 }}
                                                    />
                                                </Box>
                                                <Typography variant="caption">{asset.utilization}%</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ textAlign: 'right', ml: 3 }}>
                                            <Chip
                                                label={asset.status}
                                                size="small"
                                                color={asset.status === 'Active' ? 'success' : 'warning'}
                                                sx={{ mb: 1 }}
                                            />
                                            <Typography variant="body2" color="success.main" fontWeight="bold">
                                                {asset.roi}
                                            </Typography>
                                        </Box>
                                        <IconButton size="small" sx={{ ml: 1 }}>
                                            <MoreVert />
                                        </IconButton>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Revenue Distribution or Recent Trips */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ borderRadius: 3, height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>ROI Trend</Typography>
                                <Box sx={{ height: 200, mt: 4 }}>
                                    {/* Placeholder for actual chart component */}
                                    <Typography variant="body2" color="text.secondary" align="center">
                                        Utilization vs Revenue Graph
                                    </Typography>
                                    <Box sx={{ mt: 2, bgcolor: 'grey.100', height: 150, borderRadius: 2, display: 'flex', alignItems: 'flex-end', p: 1, gap: 1 }}>
                                        {[40, 70, 50, 90, 60, 80, 95].map((h, i) => (
                                            <Box key={i} sx={{ flex: 1, height: `${h}%`, bgcolor: 'primary.main', borderRadius: '4px 4px 0 0', opacity: 0.7 + (i * 0.05) }} />
                                        ))}
                                    </Box>
                                </Box>
                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Notifications</Typography>
                                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.dark', mb: 1 }}>
                                        <Typography variant="caption" fontWeight="bold">Maintenance Alert</Typography>
                                        <Typography variant="body2">Scania R450 is due for service in 2 days.</Typography>
                                    </Box>
                                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, color: 'success.dark' }}>
                                        <Typography variant="caption" fontWeight="bold">Payout Received</Typography>
                                        <Typography variant="body2">KES 150,000 processed for Trip #882.</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </DashboardLayout>
    );
};

export default FleetDashboard;
