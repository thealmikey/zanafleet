import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { DeliveryCard } from '../DeliveryCard';

describe('DeliveryCard', () => {
  const defaultProps = {
    deliveryId: 'DEL-001',
    status: 'in_transit',
    pickupAddress: '123 Pickup St',
    dropoffAddress: '456 Dropoff Ave',
  };

  it('renders addresses correctly', () => {
    render(<DeliveryCard {...defaultProps} />);

    expect(screen.getByText('123 Pickup St')).toBeInTheDocument();
    expect(screen.getByText('456 Dropoff Ave')).toBeInTheDocument();
  });

  it('renders status chip', () => {
    render(<DeliveryCard {...defaultProps} />);

    expect(screen.getByLabelText('Status: in_transit')).toBeInTheDocument();
  });

  it('renders delivery ID as heading', () => {
    render(<DeliveryCard {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'DEL-001' })).toBeInTheDocument();
  });

  it('renders assigned rider when provided', () => {
    render(<DeliveryCard {...defaultProps} assignedRider="John Doe" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders estimated earnings when provided', () => {
    render(<DeliveryCard {...defaultProps} estimatedEarnings={350} />);

    expect(screen.getByText('KES 350')).toBeInTheDocument();
  });

  it('is clickable when onClick is provided', () => {
    const handleClick = jest.fn();
    render(<DeliveryCard {...defaultProps} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('DEL-001');
  });

  it('is not clickable when onClick is not provided', () => {
    render(<DeliveryCard {...defaultProps} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<DeliveryCard {...defaultProps} />);

    expect(screen.getByLabelText('Delivery DEL-001, status in_transit')).toBeInTheDocument();
  });
});
