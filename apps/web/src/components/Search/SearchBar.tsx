import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    InputBase,
    IconButton,
    alpha,
    styled,
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

const SearchContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius * 2,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(3),
        width: 'auto',
        minWidth: '300px',
    },
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1),
    transition: theme.transitions.create(['width', 'background-color']),
    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    flex: 1,
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        paddingLeft: `calc(1em + ${theme.spacing(1)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
    },
}));

export const SearchBar: React.FC = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSearch = useCallback((e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            inputRef.current?.blur();
        }
    }, [query, navigate]);

    const handleClear = () => {
        setQuery('');
        inputRef.current?.focus();
    };

    return (
        <SearchContainer component="form" onSubmit={handleSearch}>
            <Box sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%' }}>
                <IconButton sx={{ p: '10px' }} aria-label="search" onClick={() => handleSearch()}>
                    <SearchIcon />
                </IconButton>
                <StyledInputBase
                    placeholder="Search orders, businesses, riders..."
                    inputProps={{ 'aria-label': 'search zanfleet' }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch();
                        }
                    }}
                    inputRef={inputRef}
                />
                {query && (
                    <IconButton sx={{ p: '10px' }} aria-label="clear" onClick={handleClear}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>
        </SearchContainer>
    );
};
