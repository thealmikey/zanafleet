import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { NotificationList } from '../NotificationList';
import type { NotificationItem } from '../NotificationList';

describe('NotificationList', () => {
  const mockItems: NotificationItem[] = [
    { id: 'n1', title: 'Test Notification', message: 'Test message', createdAt: new Date(), type: 'info', read: false },
    { id: 'n2', title: 'Warning Alert', createdAt: new Date(), type: 'warning', read: true },
  ];

  it('renders items with list role', () => {
    render(<NotificationList items={mockItems} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders notification titles', () => {
    render(<NotificationList items={mockItems} />);

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('Warning Alert')).toBeInTheDocument();
  });

  it('renders notification message when provided', () => {
    render(<NotificationList items={mockItems} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('clicking invokes callback with correct id', () => {
    const handleClick = jest.fn();
    render(<NotificationList items={mockItems} onItemClick={handleClick} />);

    fireEvent.click(screen.getByLabelText('Notification: Test Notification'));
    expect(handleClick).toHaveBeenCalledWith('n1');

    fireEvent.click(screen.getByLabelText('Notification: Warning Alert'));
    expect(handleClick).toHaveBeenCalledWith('n2');
  });

  it('shows empty state when no items', () => {
    render(<NotificationList items={[]} />);

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('has aria-live region for updates', () => {
    const { container } = render(<NotificationList items={mockItems} />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('renders different icons for different types', () => {
    const items: NotificationItem[] = [
      { id: '1', title: 'Info', createdAt: new Date(), type: 'info' },
      { id: '2', title: 'Success', createdAt: new Date(), type: 'success' },
      { id: '3', title: 'Warning', createdAt: new Date(), type: 'warning' },
      { id: '4', title: 'Error', createdAt: new Date(), type: 'error' },
    ];

    render(<NotificationList items={items} />);

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
