import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge, getStatusBadgeVariant } from './Badge';

describe('Badge', () => {
  it('renders correctly', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Badge variant="gray">Gray</Badge>);
    expect(screen.getByText('Gray')).toHaveClass('bg-gray-100');

    rerender(<Badge variant="green">Green</Badge>);
    expect(screen.getByText('Green')).toHaveClass('bg-green-100');

    rerender(<Badge variant="yellow">Yellow</Badge>);
    expect(screen.getByText('Yellow')).toHaveClass('bg-yellow-100');

    rerender(<Badge variant="red">Red</Badge>);
    expect(screen.getByText('Red')).toHaveClass('bg-red-100');

    rerender(<Badge variant="blue">Blue</Badge>);
    expect(screen.getByText('Blue')).toHaveClass('bg-blue-100');

    rerender(<Badge variant="purple">Purple</Badge>);
    expect(screen.getByText('Purple')).toHaveClass('bg-purple-100');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('px-2');
    expect(screen.getByText('Small')).toHaveClass('py-0.5');

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toHaveClass('px-2.5');
  });
});

describe('getStatusBadgeVariant', () => {
  it('returns correct variant for delivery status', () => {
    expect(getStatusBadgeVariant('Requested')).toBe('blue');
    expect(getStatusBadgeVariant('Assigned')).toBe('purple');
    expect(getStatusBadgeVariant('InTransit')).toBe('yellow');
    expect(getStatusBadgeVariant('Delivered')).toBe('green');
    expect(getStatusBadgeVariant('Failed')).toBe('red');
    expect(getStatusBadgeVariant('Cancelled')).toBe('gray');
  });

  it('returns gray for unknown status', () => {
    expect(getStatusBadgeVariant('Unknown')).toBe('gray');
  });
});
