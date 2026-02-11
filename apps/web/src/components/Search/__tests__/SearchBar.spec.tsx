import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SearchBar } from '../SearchBar';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('SearchBar Component', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    const renderSearchBar = () => render(
        <BrowserRouter>
            <SearchBar />
        </BrowserRouter>
    );

    it('1. should render the search input with placeholder', () => {
        renderSearchBar();
        expect(screen.getByPlaceholderText(/Search orders, businesses, riders/i)).toBeInTheDocument();
    });

    it('2. should update input value on change', () => {
        renderSearchBar();
        const input = screen.getByPlaceholderText(/Search orders, businesses, riders/i);
        fireEvent.change(input, { target: { value: 'Pizza' } });
        expect(input).toHaveValue('Pizza');
    });

    it('3. should show clear button only when input has text', () => {
        renderSearchBar();
        expect(screen.queryByLabelText(/clear/i)).not.toBeInTheDocument();

        const input = screen.getByPlaceholderText(/Search orders, businesses, riders/i);
        fireEvent.change(input, { target: { value: 'Pizza' } });
        expect(screen.getByLabelText(/clear/i)).toBeInTheDocument();
    });

    it('4. should clear input when clear button is clicked', () => {
        renderSearchBar();
        const input = screen.getByPlaceholderText(/Search orders, businesses, riders/i);
        fireEvent.change(input, { target: { value: 'Pizza' } });

        const clearBtn = screen.getByLabelText(/clear/i);
        fireEvent.click(clearBtn);

        expect(input).toHaveValue('');
    });

    it('5. should navigate to search results page on Enter', () => {
        renderSearchBar();
        const input = screen.getByPlaceholderText(/Search orders, businesses, riders/i);
        fireEvent.change(input, { target: { value: 'Pizza' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(mockNavigate).toHaveBeenCalledWith('/search?q=Pizza');
    });

    it('6. should navigate on search icon click', () => {
        renderSearchBar();
        const input = screen.getByPlaceholderText(/Search orders, businesses, riders/i);
        fireEvent.change(input, { target: { value: 'Burger' } });

        const searchBtn = screen.getByLabelText(/search/i);
        fireEvent.click(searchBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/search?q=Burger');
    });

    it('7. should not navigate if input is empty', () => {
        renderSearchBar();
        const searchBtn = screen.getByLabelText(/search/i);
        fireEvent.click(searchBtn);

        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
