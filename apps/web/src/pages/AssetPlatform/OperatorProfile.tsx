import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Container,
    Avatar,
    Chip,
    Rating,
    Divider,
    Button,
} from '@mui/material';
import {
    VerifiedUser,
    History,
    Commute,
    WorkspacePremium,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/Layout';

const OperatorProfile: React.FC = () => {
    const operator = {
        name: 'Samuel Mwangi',
        avatar: '', // Mock avatar
        rating: 4.8,
        trips: 1240,
        experience: '6 Years',
        skills: ['Long-haul Driving', 'Refrigerated Transport', 'Cargo Safety', 'Route Optimization'],
        certifications: [
            { name: 'NTSA Class B/C/E', issued: '2023', status: 'Verified' },
            { name: 'Hazardous Materials Handling', issued: '2024', status: 'Verified' },
        ],
        careerHistory: [
            { role: 'Senior Driver', company: 'ZanaFleet Logistics', period: '2024 - Present' },
            { role: 'Delivery Lead', company: 'QuickCourier Kenay', period: '2022 - 2024' },
        ],
    };

    return (
        <DashboardLayout title="Operator Profile">
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                {/* Profile Header */}
                <Card sx={{ borderRadius: 4, overflow: 'hidden', mb: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                    <Box sx={{ height: 160, background: 'linear-gradient(90deg, #004d40 0%, #00796b 100%)' }} />
                    <CardContent sx={{ pt: 0, position: 'relative' }}>
                        <Box sx={{ display: 'flex', mt: -8, alignItems: 'flex-end', mb: 2 }}>
                            <Avatar
                                src={operator.avatar}
                                sx={{
                                    width: 120,
                                    height: 120,
                                    border: '4px solid white',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                    bgcolor: 'primary.main',
                                }}
                            >
                                SM
                            </Avatar>
                            <Box sx={{ ml: 3, mb: 1 }}>
                                <Typography variant="h4" fontWeight="bold">
                                    {operator.name} <VerifiedUser color="primary" sx={{ verticalAlign: 'middle' }} />
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Professional Logistics Operator • {operator.experience} Exp.
                                </Typography>
                            </Box>
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Rating value={operator.rating} readOnly precision={0.5} size="small" />
                                    <Typography variant="body2" fontWeight="bold">({operator.rating})</Typography>
                                </Box>
                            </Grid>
                            <Grid item>
                                <Typography variant="body2" color="text.secondary">| {operator.trips} Successful Trips</Typography>
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {operator.skills.map(skill => (
                                <Chip key={skill} label={skill} variant="outlined" size="small" />
                            ))}
                        </Box>
                    </CardContent>
                </Card>

                <Grid container spacing={4}>
                    <Grid item xs={12} md={7}>
                        {/* Career History */}
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History /> Career History
                        </Typography>
                        <Card sx={{ borderRadius: 3, mb: 4 }}>
                            <CardContent>
                                {operator.careerHistory.map((item, index) => (
                                    <Box key={index}>
                                        <Box sx={{ py: 2 }}>
                                            <Typography variant="subtitle1" fontWeight="bold">{item.role}</Typography>
                                            <Typography variant="body2" color="text.secondary">{item.company} • {item.period}</Typography>
                                        </Box>
                                        {index < operator.careerHistory.length - 1 && <Divider />}
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Assets Operated */}
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Commute /> Specialized Assets
                        </Typography>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Grid container spacing={2}>
                                    {['Heavy Trucks', 'Refrigerated Vans', 'Forklifts'].map(asset => (
                                        <Grid item xs={6} key={asset}>
                                            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="body2" fontWeight="bold">{asset}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        {/* Certifications */}
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkspacePremium /> Verified Certifications
                        </Typography>
                        {operator.certifications.map((cert, index) => (
                            <Card key={index} sx={{ borderRadius: 3, mb: 2, borderLeft: '6px solid', borderColor: 'primary.main' }}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">{cert.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">Issued {cert.issued} • {cert.status}</Typography>
                                </CardContent>
                            </Card>
                        ))}

                        <Box sx={{ mt: 4, p: 3, bgcolor: 'primary.dark', borderRadius: 4, color: 'white', textAlign: 'center' }}>
                            <Typography variant="h6" gutterBottom>Trust Score</Typography>
                            <Typography variant="h3" fontWeight="bold">98%</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                                Samuel is among the top 5% of operators in Nairobi.
                            </Typography>
                            <Button fullWidth variant="contained" color="secondary" sx={{ mt: 3, borderRadius: 2 }}>
                                Hire Operator
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </DashboardLayout>
    );
};

export default OperatorProfile;
