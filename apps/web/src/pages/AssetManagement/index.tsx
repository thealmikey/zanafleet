import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Tab,
    Tabs,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    LocalShipping,
    Warehouse,
    Build,
    Edit as EditIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/Layout';
import AssetForm from './AssetForm';

interface AssetImage {
    mediaId: string;
    purpose?: string;
    isPrimary?: boolean;
}

interface Asset {
    assetId: string;
    name: string;
    type: string;
    status: string;
    ownerId: string;
    imageIds?: AssetImage[];
    capacity?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const AssetManagement = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/assets');
            // const data = await response.json();
            // setAssets(data);
            setAssets([]);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAssetIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'vehicle':
                return <LocalShipping />;
            case 'warehouse':
                return <Warehouse />;
            case 'equipment':
                return <Build />;
            default:
                return <LocalShipping />;
        }
    };

    const getPrimaryImageUrl = (imageIds?: AssetImage[]) => {
        if (!imageIds || imageIds.length === 0) return null;
        const primary = imageIds.find(img => img.isPrimary);
        const mediaId = primary?.mediaId || imageIds[0].mediaId;
        return `/api/media/${mediaId}`;
    };

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            Asset Management
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage your fleet vehicles, equipment, and warehouses
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setShowCreateForm(true)}
                        sx={{ borderRadius: 2 }}
                    >
                        Create Asset
                    </Button>
                </Box>

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
                        <Tab label="All Assets" />
                        <Tab label="Vehicles" />
                        <Tab label="Warehouses" />
                        <Tab label="Equipment" />
                    </Tabs>
                </Box>

                {/* Search */}
                <Box sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ maxWidth: 500 }}
                    />
                </Box>

                {/* Asset Grid */}
                {loading ? (
                    <Typography>Loading assets...</Typography>
                ) : filteredAssets.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No assets found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Get started by creating your first asset
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setShowCreateForm(true)}
                        >
                            Create Asset
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {filteredAssets.map((asset) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={asset.assetId}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                                    <CardMedia
                                        component="div"
                                        sx={{
                                            height: 180,
                                            bgcolor: 'grey.200',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundImage: getPrimaryImageUrl(asset.imageIds) ? `url(${getPrimaryImageUrl(asset.imageIds)})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    >
                                        {!getPrimaryImageUrl(asset.imageIds) && (
                                            <Box sx={{ textAlign: 'center', color: 'grey.500' }}>
                                                {getAssetIcon(asset.type)}
                                                <Typography variant="caption" display="block" mt={1}>
                                                    No Image
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardMedia>
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                            <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
                                                {asset.name}
                                            </Typography>
                                            <Chip
                                                label={asset.status}
                                                size="small"
                                                color={asset.status === 'ACTIVE' ? 'success' : 'default'}
                                            />
                                        </Box>
                                        <Chip
                                            icon={getAssetIcon(asset.type)}
                                            label={asset.type}
                                            size="small"
                                            variant="outlined"
                                            sx={{ mb: 1 }}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            {asset.imageIds?.length || 0} images
                                        </Typography>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                                        <IconButton size="small" color="primary">
                                            <ViewIcon />
                                        </IconButton>
                                        <IconButton size="small" color="primary">
                                            <EditIcon />
                                        </IconButton>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Create Asset Form Dialog */}
                {showCreateForm && (
                    <AssetForm
                        open={showCreateForm}
                        onClose={() => setShowCreateForm(false)}
                        onSuccess={() => {
                            setShowCreateForm(false);
                            fetchAssets();
                        }}
                    />
                )}
            </Container>
        </DashboardLayout>
    );
};

export default AssetManagement;
