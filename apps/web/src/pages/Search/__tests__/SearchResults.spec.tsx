import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SearchResultsPage } from '../SearchResults';
import * as searchApi from '../../services/searchApi';
import { AuthProvider } from '../../contexts/AuthContext';

jest.mock('../../services/searchApi');
const mockedSearchApi = searchApi as jest.Mocked<typeof searchApi>;

const mockSearchResults = {
    items: [
        {
            entityId: 'biz-1',
            entityType: 'Business',
            title: 'Zana Pizza',
            description: 'The best pizza',
            metadata: { status: 'active' },
            createdAt: new Date().toISOString(),
        },
        {
            entityId: 'ord-1',
            entityType: 'Order',
            title: 'Order PEPE',
            description: 'Pepperoni Pizza',
            metadata: { status: 'pending' },
            createdAt: new Date().toISOString(),
        }
    ],
    total: 2,
    query: 'Pizza',
    processingTimeMs: 15,
};

describe('SearchResultsPage Component', () => {
    beforeEach(() => {
        mockedSearchApi.search.mockResolvedValue(mockSearchResults);
    });

    const renderPage = () => render(
        <BrowserRouter>
            <AuthProvider>
                <SearchResultsPage />
            </AuthProvider>
        </BrowserRouter>
    );

    it('8. should show loading state initially', async () => {
        renderPage();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('9. should render results list after loading', async () => {
        renderPage();
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        expect(screen.getByText('Zana Pizza')).toBeInTheDocument();
        expect(screen.getByText('Order PEPE')).toBeInTheDocument();
    });

    it('10. should display correct icons for different entity types', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('Zana Pizza')).toBeInTheDocument());

        // Check for icons (via secondary identifiers or just presence of result cards)
        expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(2); // MUI Icons are SVG but often have role="img"
    });

    it('11. should display metadata chips (status)', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('Zana Pizza')).toBeInTheDocument());

        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('12. should show "No results" message when items list is empty', async () => {
        mockedSearchApi.search.mockResolvedValue({ items: [], total: 0, query: 'Empty', processingTimeMs: 5 });
        renderPage();

        await waitFor(() => expect(screen.getByText(/No matching results found/i)).toBeInTheDocument());
    });

    it('13. should display processing statistics (count and time)', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('Zana Pizza')).toBeInTheDocument());

        expect(screen.getByText(/\(2 items found in 15ms\)/i)).toBeInTheDocument();
    });

    it('14. should render the filters sidebar', () => {
        renderPage();
        expect(screen.getByText(/Filters/i)).toBeInTheDocument();
    });

    it('15. should show error message on API failure', async () => {
        mockedSearchApi.search.mockRejectedValue(new Error('API Down'));
        renderPage();

        await waitFor(() => expect(screen.getByText(/Failed to load search results/i)).toBeInTheDocument());
    });
});
