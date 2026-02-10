import React from 'react';
import { render, screen } from '@testing-library/react';

import { KPIGrid } from '../KPIGrid';

describe('KPIGrid', () => {
  const mockItems = [
    { title: 'Orders', value: 100 },
    { title: 'Revenue', value: 'KES 50K' },
    { title: 'Users', value: 25 },
  ];

  it('renders multiple metric cards', () => {
    render(<KPIGrid items={mockItems} />);

    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revenue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
  });

  it('can be queried by headings', () => {
    render(<KPIGrid items={mockItems} />);

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(3);
  });

  it('uses getAriaLabel callback when provided', () => {
    render(
      <KPIGrid
        items={mockItems}
        getAriaLabel={(idx, item) => `KPI ${idx}: ${item.title}`}
      />
    );

    expect(screen.getByRole('region', { name: 'KPI 0: Orders' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'KPI 1: Revenue' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'KPI 2: Users' })).toBeInTheDocument();
  });

  it('renders values correctly', () => {
    render(<KPIGrid items={mockItems} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('KES 50K')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });
});
