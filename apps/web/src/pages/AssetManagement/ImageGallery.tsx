import { useState, useCallback } from 'react';
import {
    Box,
    Grid,
    Card,
    CardMedia,
    CardActions,
    IconButton,
    Chip,
    MenuItem,
    Select,
    Typography,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
} from '@mui/icons-material';

interface ImageData {
    mediaId: string;
    purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
    isPrimary?: boolean;
}

interface ImageGalleryProps {
    images: ImageData[];
    onChange: (images: ImageData[]) => void;
}

const ImageGallery = ({ images, onChange }: ImageGalleryProps) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            // TODO: Upload to Media Engine
            // For now, create mock media IDs
            const newImages: ImageData[] = Array.from(files).map((_, index) => ({
                mediaId: `media-${Date.now()}-${index}`,
                purpose: 'custom' as const,
                isPrimary: images.length === 0 && index === 0, // First image is primary if no images exist
            }));

            onChange([...images, ...newImages]);
        } catch (error) {
            console.error('Failed to upload images:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleSetPrimary = (mediaId: string) => {
        const updated = images.map(img => ({
            ...img,
            isPrimary: img.mediaId === mediaId,
        }));
        onChange(updated);
    };

    const handleUpdatePurpose = (mediaId: string, purpose: ImageData['purpose']) => {
        const updated = images.map(img =>
            img.mediaId === mediaId ? { ...img, purpose } : img
        );
        onChange(updated);
    };

    const handleRemove = (mediaId: string) => {
        const filtered = images.filter(img => img.mediaId !== mediaId);
        // If we removed the primary image, set first image as primary
        if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
            filtered[0].isPrimary = true;
        }
        onChange(filtered);
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            // TODO: Upload to Media Engine
            const newImages: ImageData[] = Array.from(files).map((_, index) => ({
                mediaId: `media-${Date.now()}-${index}`,
                purpose: 'custom' as const,
                isPrimary: images.length === 0 && index === 0,
            }));

            onChange([...images, ...newImages]);
        } catch (error) {
            console.error('Failed to upload images:', error);
        } finally {
            setUploading(false);
        }
    }, [images, onChange]);

    return (
        <Box>
            {/* Upload Area */}
            <Box
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                sx={{
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'grey.50',
                    cursor: 'pointer',
                    mb: 2,
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.50',
                    },
                }}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                />
                <label htmlFor="image-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                    <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="body1" gutterBottom>
                        {uploading ? 'Uploading...' : 'Drag & drop images here or click to browse'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Supports: JPG, PNG, WebP (max 5MB each)
                    </Typography>
                </label>
            </Box>

            {/* Image Grid */}
            {images.length > 0 && (
                <Grid container spacing={2}>
                    {images.map((image) => (
                        <Grid item xs={6} sm={4} md={3} key={image.mediaId}>
                            <Card sx={{ position: 'relative' }}>
                                {image.isPrimary && (
                                    <Chip
                                        label="Primary"
                                        size="small"
                                        color="primary"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            zIndex: 1,
                                        }}
                                    />
                                )}
                                <CardMedia
                                    component="div"
                                    sx={{
                                        height: 140,
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary">
                                        {image.mediaId}
                                    </Typography>
                                </CardMedia>
                                <Box sx={{ p: 1 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Purpose</InputLabel>
                                        <Select
                                            value={image.purpose || 'custom'}
                                            label="Purpose"
                                            onChange={(e) => handleUpdatePurpose(
                                                image.mediaId,
                                                e.target.value as ImageData['purpose']
                                            )}
                                        >
                                            <MenuItem value="exterior">Exterior</MenuItem>
                                            <MenuItem value="interior">Interior</MenuItem>
                                            <MenuItem value="cargo">Cargo</MenuItem>
                                            <MenuItem value="dashboard">Dashboard</MenuItem>
                                            <MenuItem value="custom">Custom</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleSetPrimary(image.mediaId)}
                                        color={image.isPrimary ? 'primary' : 'default'}
                                    >
                                        {image.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemove(image.mediaId)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default ImageGallery;
