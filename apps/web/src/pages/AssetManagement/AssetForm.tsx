import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    Box,
    Typography,
} from '@mui/material';
import ImageGallery from './ImageGallery';

interface AssetFormProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asset?: any; // For editing existing assets
}

const AssetForm = ({ open, onClose, onSuccess, asset }: AssetFormProps) => {
    const [formData, setFormData] = useState({
        name: asset?.name || '',
        type: asset?.type || 'VEHICLE',
        ownerId: asset?.ownerId || '',
        ownerType: asset?.ownerType || 'Individual',
        capacity: asset?.capacity || {},
        metadata: asset?.metadata || {},
    });
    const [images, setImages] = useState<Array<{
        mediaId: string;
        purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
        isPrimary?: boolean;
    }>>(asset?.imageIds || []);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                imageIds: images,
            };

            // TODO: Replace with actual API call
            // const response = await fetch('/api/assets', {
            //     method: asset ? 'PATCH' : 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(payload),
            // });

            console.log('Creating asset:', payload);
            onSuccess();
        } catch (error) {
            console.error('Failed to save asset:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {asset ? 'Edit Asset' : 'Create New Asset'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                label="Asset Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Isuzu FXZ 28-330 - KDB 829C"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                required
                                select
                                label="Asset Type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <MenuItem value="VEHICLE">Vehicle</MenuItem>
                                <MenuItem value="WAREHOUSE">Warehouse</MenuItem>
                                <MenuItem value="EQUIPMENT">Equipment</MenuItem>
                                <MenuItem value="OTHER">Other</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                required
                                select
                                label="Owner Type"
                                value={formData.ownerType}
                                onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
                            >
                                <MenuItem value="Individual">Individual</MenuItem>
                                <MenuItem value="Organization">Organization</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                label="Owner ID"
                                value={formData.ownerId}
                                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                                placeholder="UUID of owner"
                            />
                        </Grid>

                        {/* Image Gallery */}
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    Images
                                </Typography>
                                <ImageGallery
                                    images={images}
                                    onChange={setImages}
                                />
                            </Box>
                        </Grid>

                        {/* TODO: Add capacity and metadata editors */}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : asset ? 'Update Asset' : 'Create Asset'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default AssetForm;
