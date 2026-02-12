import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Container,
    Grid,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
} from '@mui/material';
import {
    Search as SearchIcon,
    Business as BusinessIcon,
    Receipt as OrderIcon,
    LocalShipping as DeliveryIcon,
    Person as ActorIcon,
} from '@mui/icons-material';

import { DashboardLayout } from '../../components/Layout/DashboardLayout';
import { search, SearchResults, SearchDocument } from '../../services/searchApi';
import { useAuth } from '../../hooks/useAuth';

export const SearchResultsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const { token } = useAuth();

    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) return;
            setLoading(true);
            setError(null);
            try {
                const data = await search({ q: query }, token ?? undefined);
                setResults(data);
            } catch (err) {
                console.error('Search failed:', err);
                setError('Failed to load search results. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, token]);

    const getEntityIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'business': return <BusinessIcon color="primary" />;
            case 'order': return <OrderIcon color="secondary" />;
            case 'delivery': return <DeliveryIcon color="success" />;
            default: return <ActorIcon />;
        }
    };

    const ResultCard = ({ doc }: { doc: SearchDocument }) => (
        <Card sx={{ mb: 2, '&:hover': { boxShadow: 4, cursor: 'pointer' } }}>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ mt: 0.5 }}>
                        {getEntityIcon(doc.entityType)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" component="div">
                                {doc.title}
                            </Typography>
                            <Chip
                                label={doc.entityType.toUpperCase()}
                                size="small"
                                variant="outlined"
                                color={doc.entityType === 'Business' ? 'primary' : 'default'}
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {doc.description}
                        </Typography>
                        {doc.metadata.status && (
                            <Chip
                                label={doc.metadata.status}
                                size="small"
                                sx={{ mt: 1, textTransform: 'capitalize' }}
                            />
                        )}
                        <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 1 }}>
                            ID: {doc.entityId} • Updated {new Date(doc.createdAt).toLocaleDateString()}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout title="Search Results">
            <Container maxWidth="lg">
                <Box sx={{ py: 4 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                        <SearchIcon color="action" />
                        <Typography variant="h4">
                            Results for "{query}"
                        </Typography>
                        {results && (
                            <Typography variant="body1" color="text.secondary">
                                ({results.total} items found in {results.processingTimeMs}ms)
                            </Typography>
                        )}
                    </Stack>

                    <Divider sx={{ mb: 4 }} />

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'error.light' }}>
                            <Typography color="error">{error}</Typography>
                        </Paper>
                    ) : results?.items.length === 0 ? (
                        <Paper sx={{ p: 10, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">
                                No matching results found for your query.
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                                Try using different keywords or checking for typos.
                            </Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={8}>
                                {results?.items.map((doc) => (
                                    <ResultCard key={doc.entityId} doc={doc} />
                                ))}
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Advanced filters for workspace, location, and date range coming soon...
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Container>
        </DashboardLayout>
    );
};
