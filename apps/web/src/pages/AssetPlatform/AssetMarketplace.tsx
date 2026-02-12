import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Container,
    TextField,
    Button,
    Chip,
    IconButton,
    InputAdornment,
    Paper,
    Avatar,
    CircularProgress,
} from '@mui/material';
import {
    Search,
    SmartToy,
    LocalShipping,
    FilterList,
    ArrowForward,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/Layout';

const AssetMarketplace: React.FC = () => {
    const [aiQuery, setAiQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const assets = [
        { id: '1', name: 'Heavy Duty Trailer', type: 'VEHICLE', price: 'KES 2,500/hr', rating: 4.9, image: '' },
        { id: '2', name: 'Cold Storage Room', type: 'WAREHOUSE', price: 'KES 5,000/day', rating: 4.7, image: '' },
        { id: '3', name: 'Electric Forklift', type: 'EQUIPMENT', price: 'KES 800/hr', rating: 4.8, image: '' },
        { id: '4', name: 'Transit Van (High Roof)', type: 'VEHICLE', price: 'KES 1,200/hr', rating: 4.5, image: '' },
    ];

    const handleAiSearch = () => {
        if (!aiQuery) return;
        setLoading(true);
        // Mimic AI analysis delay
        setTimeout(() => {
            setResults(assets.slice(0, 2));
            setLoading(false);
        }, 1500);
    };

    return (
        <DashboardLayout title="Asset Marketplace">
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {/* AI Selection Tool - Featured prominently */}
                <Paper
                    sx={{
                        p: 4,
                        mb: 6,
                        borderRadius: 5,
                        background: 'linear-gradient(135deg, #283593 0%, #1a237e 100%)',
                        color: 'white',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                            <SmartToy fontSize="large" />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="bold">AI Asset Finder</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                Tell me what you need to move or store, and I'll find the perfect asset for you.
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="e.g., 'I need to move 5 tons of chilled beef from Thika to Mombasa next Tuesday'"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.1)',
                                borderRadius: 3,
                                '& .MuiOutlinedInput-root': {
                                    color: 'white',
                                    '& fieldset': { borderColor: 'transparent' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                    '&.Mui-focused fieldset': { borderColor: 'white' },
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'rgba(255,255,255,0.7)' }} />
                                    </InputAdornment>
                                ),
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
                        />
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleAiSearch}
                            disabled={loading}
                            sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Find Match'}
                        </Button>
                    </Box>

                    {results.length > 0 && (
                        <Box sx={{ mt: 4, p: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.7 }}>PROPOSED MATCHES BASED ON AI ANALYSIS:</Typography>
                            <Grid container spacing={2}>
                                {results.map(res => (
                                    <Grid item xs={12} md={6} key={res.id}>
                                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="bold">{res.name}</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>Matches requirement: Cold Storage / Long Distance</Typography>
                                            </Box>
                                            <IconButton color="inherit"><ArrowForward /></IconButton>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </Paper>

                {/* Regular Marketplace View */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold">Explore Marketplace</Typography>
                    <Button startIcon={<FilterList />} variant="outlined" sx={{ borderRadius: 2 }}>Filters</Button>
                </Box>

                <Grid container spacing={4}>
                    {assets.map((asset) => (
                        <Grid item xs={12} sm={6} md={3} key={asset.id}>
                            <Card sx={{ borderRadius: 4, height: '100%', transition: '0.3s', '&:hover': { transform: 'translateY(-8px)', boxShadow: 10 } }}>
                                <Box sx={{ height: 160, bgcolor: 'grey.200', position: 'relative' }}>
                                    <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                                        <Chip label={asset.type} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }} />
                                    </Box>
                                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'grey.500' }}>
                                        <LocalShipping sx={{ fontSize: 60, opacity: 0.2 }} />
                                    </Box>
                                </Box>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>{asset.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Reliable {asset.type.toLowerCase()} for all your logistics needs.
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary">{asset.price}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="body2" fontWeight="bold">{asset.rating}</Typography>
                                            <SmartToy sx={{ fontSize: 16, color: 'warning.main' }} />
                                        </Box>
                                    </Box>
                                    <Button fullWidth variant="contained" sx={{ mt: 3, borderRadius: 2, py: 1 }}>
                                        View Availability
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </DashboardLayout>
    );
};

export default AssetMarketplace;
