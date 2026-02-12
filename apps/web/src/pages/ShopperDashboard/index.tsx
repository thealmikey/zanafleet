import React, { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    Paper,
    Divider,
    Button,
    List,
    Chip,
} from '@mui/material';
import {
    ShoppingBag as OrderIcon,
    History as HistoryIcon,
    TrendingUp as InsightsIcon,
    Storefront as StoreIcon,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/Layout';
import { KPIGrid, LineChart } from '../../components/common';
import { getShopperOrders, getShopperInsights } from '../../services/customerApi';
import { useAuth } from '../../hooks/useAuth';

const OverviewTab: React.FC<{ insights: any; spendingData: any }> = ({ insights, spendingData }) => (
    <Box>
        <Typography variant="h6" gutterBottom>Purchasing Insights</Typography>
        <KPIGrid
            items={[
                { title: 'Monthly Spend', value: `KES ${insights?.totalSpendMonth || 0}`, icon: <InsightsIcon />, color: 'primary' },
                { title: 'Top Merchant', value: insights?.topMerchant || 'N/A', icon: <StoreIcon />, color: 'secondary' },
            ]}
            md={6}
        />

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Spending Trend</Typography>
        <Paper sx={{ p: 2 }}>
            <LineChart
                data={spendingData}
                height={300}
                ariaLabel="Monthly spending trend"
            />
        </Paper>
    </Box>
);

const OrdersTab: React.FC<{ orders: any[] }> = ({ orders }) => (
    <Box>
        <Typography variant="h6" gutterBottom>Your Deliveries</Typography>
        <List>
            {orders.map((order) => (
                <Card key={order.orderId} sx={{ mb: 2 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{order.businessName}</Typography>
                                <Typography variant="body2" color="text.secondary">{order.itemSummary}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Chip
                                    label={order.status}
                                    color={order.status === 'Delivered' ? 'success' : 'warning'}
                                    size="small"
                                />
                                <Typography variant="subtitle2" sx={{ mt: 1 }}>KES {order.totalAmount}</Typography>
                            </Box>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                                Ordered on {new Date(order.createdAt).toLocaleDateString()}
                            </Typography>
                            <Button size="small">Track Delivery</Button>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </List>
    </Box>
);

const InsightsTab: React.FC<{ insights: any }> = ({ insights }) => (
    <Box>
        <Typography variant="h6" gutterBottom>Store Affinity</Typography>
        <Grid container spacing={2}>
            {(insights?.merchantAffinity || []).map((m: any) => (
                <Grid item xs={12} md={6} key={m.name}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="subtitle1">{m.name}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Spent: KES {m.spend}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Orders: {m.orders}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    </Box>
);

export function ShopperDashboard(): React.ReactElement {
    const { user } = useAuth();
    const [tab, setTab] = useState(0);
    const [orders, setOrders] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);

    const spendingData = React.useMemo(() => {
        if (!insights?.spendingTrend) return { labels: [], datasets: [] };
        return {
            labels: insights.spendingTrend.map((t: any) => t.month),
            datasets: [{
                label: 'Monthly Spending',
                data: insights.spendingTrend.map((t: any) => t.amount),
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
    }, [insights]);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const [oRes, iRes] = await Promise.all([
                    getShopperOrders(user.id),
                    getShopperInsights(user.id)
                ]);
                setOrders(oRes || []);
                setInsights(iRes);
            } catch (err) {
                console.error('Failed to load shopper data');
            }
        };
        loadData();
    }, [user]);

    return (
        <DashboardLayout title="Shopper Dashboard">
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Welcome back, {user?.name}</Typography>
                    <Typography color="text.secondary">Manage your orders and see your shopping insights</Typography>
                </Box>

                <Paper sx={{ mb: 4 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
                        <Tab icon={<InsightsIcon />} label="Overview" />
                        <Tab icon={<OrderIcon />} label="Orders" />
                        <Tab icon={<HistoryIcon />} label="Insights" />
                    </Tabs>
                </Paper>

                <Box sx={{ mt: 2 }}>
                    {tab === 0 && <OverviewTab insights={insights} spendingData={spendingData} />}
                    {tab === 1 && <OrdersTab orders={orders} />}
                    {tab === 2 && <InsightsTab insights={insights} />}
                </Box>
            </Container>
        </DashboardLayout>
    );
};
