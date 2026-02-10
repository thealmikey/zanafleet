import React from 'react';
import { render, screen } from '@testing-library/react';

import { MetricsCard } from '../MetricsCard';

describe('MetricsCard', () => {
  it('renders title and value', () => {
    render(<MetricsCard title="Total Orders" value={1247} />);

    expect(screen.getByRole('heading', { name: 'Total Orders' })).toBeInTheDocument();
    expect(screen.getByText('1247')).toBeInTheDocument();
  });

  it('supports aria-label query', () => {
    render(<MetricsCard title="Revenue" value="KES 100" ariaLabel="Revenue metric" />);

    expect(screen.getByRole('region', { name: 'Revenue metric' })).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<MetricsCard title="Orders" value={50} subtitle="Last 7 days" />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('renders trend up icon when direction is up', () => {
    render(<MetricsCard title="Sales" value={100} trend={{ direction: 'up', label: '+10%' }} />);

    expect(screen.getByLabelText('trending up')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('renders trend down icon when direction is down', () => {
    render(<MetricsCard title="Losses" value={50} trend={{ direction: 'down' }} />);

    expect(screen.getByLabelText('trending down')).toBeInTheDocument();
  });

  it('renders trend flat icon when direction is flat', () => {
    render(<MetricsCard title="Stable" value={75} trend={{ direction: 'flat' }} />);

    expect(screen.getByLabelText('trending flat')).toBeInTheDocument();
  });

  it('shows loading spinner when loading is true', () => {
    render(<MetricsCard title="Loading" value={0} loading />);

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('uses default aria-label when not provided', () => {
    render(<MetricsCard title="Test Metric" value={123} />);

    expect(screen.getByRole('region', { name: 'Test Metric metric' })).toBeInTheDocument();
  });
});
