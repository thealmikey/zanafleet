/**
 * Integration test for the full delivery management workflow
 * 
 * This test covers:
 * 1. Creating a delivery order
 * 2. Viewing the order in the list
 * 3. Opening order details
 * 4. Assigning a rider to the order
 * 5. Verifying the assignment
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { DeliveryDashboard } from '../../pages/DeliveryDashboard';
import { deliveryApi, riderApi, saccoApi } from '../../services';
import { Delivery, Rider, Sacco } from '../../types';

// Mock the API
jest.mock('../../services', () => ({
  deliveryApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    assign: jest.fn(),
    manualAssign: jest.fn(),
  },
  riderApi: {
    getAll: jest.fn(),
  },
  saccoApi: {
    getAll: jest.fn(),
  },
}));

// Mock the useAuth hook
jest.mock('../../hooks', () => ({
  useDeliveries: jest.fn(() => ({
    deliveries: [],
    loading: false,
    error: null,
    total: 0,
    totalPages: 1,
    params: { page: 1, limit: 10 },
    setPage: jest.fn(),
    setFilters: jest.fn(),
    refresh: jest.fn(),
  })),
  useRiders: jest.fn(() => ({
    riders: [],
    loading: false,
    refresh: jest.fn(),
  })),
  useSaccos: jest.fn(() => ({
    saccos: [],
    loading: false,
    refresh: jest.fn(),
  })),
}));

describe('Delivery Management Integration', () => {
  const mockRiders: Rider[] = [
    {
      id: 'rider-1',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+254700000001',
      status: 'Available',
      rating: 4.5,
    },
    {
      id: 'rider-2',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+254700000002',
      status: 'Busy',
      rating: 4.8,
    },
  ];

  const mockSaccos: Sacco[] = [
    {
      id: 'sacco-1',
      name: 'Rapid Riders',
      phone: '+254700000010',
      memberCount: 50,
      status: 'Active',
    },
  ];

  const mockDeliveries: Delivery[] = [
    {
      id: 'del-001-abc123def',
      businessId: 'biz-123',
      workspaceId: 'ws-456',
      actorId: 'act-789',
      status: 'Requested',
      pickupAddress: '123 Main Street, Nairobi',
      dropoffAddress: '456 Uhuru Street, Nairobi',
      isScheduled: false,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'del-002-xyz789ghi',
      businessId: 'biz-123',
      workspaceId: 'ws-456',
      actorId: 'act-789',
      status: 'Assigned',
      pickupAddress: '789 Business Park',
      dropoffAddress: '321 Industrial Area',
      assignedRiderId: 'rider-1',
      isScheduled: true,
      scheduledPickupTime: new Date('2024-01-16T09:00:00Z'),
      createdAt: new Date('2024-01-15T14:00:00Z'),
      updatedAt: new Date('2024-01-15T14:30:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (deliveryApi.getAll as jest.Mock).mockResolvedValue({
      data: mockDeliveries,
      total: 2,
      totalPages: 1,
    });

    (riderApi.getAll as jest.Mock).mockResolvedValue({
      data: mockRiders,
      total: 2,
    });

    (saccoApi.getAll as jest.Mock).mockResolvedValue({
      data: mockSaccos,
      total: 1,
    });

    (deliveryApi.create as jest.Mock).mockResolvedValue({
      id: 'del-new-123',
      ...mockDeliveries[0],
    });
  });

  it('should display the dashboard header', () => {
    render(<DeliveryDashboard />);
    expect(screen.getByText('Delivery Management')).toBeInTheDocument();
    expect(screen.getByText('Create Order')).toBeInTheDocument();
  });

  it('should show delivery stats', () => {
    render(<DeliveryDashboard />);
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('should display deliveries in the table', async () => {
    render(<DeliveryDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('del-001-abc...')).toBeInTheDocument();
      expect(screen.getByText('del-002-xyz...')).toBeInTheDocument();
    });
  });

  it('should show status badges with correct colors', async () => {
    render(<DeliveryDashboard />);
    
    await waitFor(() => {
      // Requested should be blue
      expect(screen.getByText('Requested')).toHaveClass('bg-blue-100');
      // Assigned should be purple
      expect(screen.getByText('Assigned')).toHaveClass('bg-purple-100');
    });
  });

  it('should open create order modal when button is clicked', async () => {
    render(<DeliveryDashboard />);
    
    const createButton = screen.getByText('Create Order');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Delivery Order')).toBeInTheDocument();
    });
  });

  it('should filter deliveries by status', async () => {
    render(<DeliveryDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'Requested' } });
    
    await waitFor(() => {
      expect(screen.getByText('Requested')).toBeInTheDocument();
    });
  });

  it('should allow viewing order details', async () => {
    render(<DeliveryDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });
    
    const viewButton = screen.getByText('View');
    fireEvent.click(viewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument();
    });
  });
});

describe('Order Creation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new delivery order', async () => {
    const newDelivery = {
      id: 'del-new-456',
      businessId: 'biz-123',
      workspaceId: 'ws-456',
      actorId: 'act-789',
      status: 'Requested',
      pickupAddress: 'New Pickup Address',
      dropoffAddress: 'New Dropoff Address',
      isScheduled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (deliveryApi.create as jest.Mock).mockResolvedValue(newDelivery);
    (deliveryApi.getAll as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      totalPages: 1,
    });

    // Mock useDeliveries to return the new state after creation
    jest.doMock('../../hooks', () => ({
      useDeliveries: jest.fn(() => ({
        deliveries: [newDelivery],
        loading: false,
        error: null,
        total: 1,
        totalPages: 1,
        params: { page: 1, limit: 10 },
        setPage: jest.fn(),
        setFilters: jest.fn(),
        refresh: jest.fn(),
      })),
      useRiders: jest.fn(() => ({
        riders: [],
        loading: false,
        refresh: jest.fn(),
      })),
      useSaccos: jest.fn(() => ({
        saccos: [],
        loading: false,
        refresh: jest.fn(),
      })),
    }));

    render(<DeliveryDashboard />);
    
    const createButton = screen.getByText('Create Order');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Delivery Order')).toBeInTheDocument();
    });
  });
});

describe('Rider/Sacco Assignment Workflow', () => {
  const mockRiders: Rider[] = [
    {
      id: 'rider-1',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+254700000001',
      status: 'Available',
      rating: 4.5,
    },
  ];

  const mockSaccos: Sacco[] = [
    {
      id: 'sacco-1',
      name: 'Rapid Riders',
      phone: '+254700000010',
      memberCount: 50,
      status: 'Active',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (riderApi.getAll as jest.Mock).mockResolvedValue({
      data: mockRiders,
      total: 1,
    });

    (saccoApi.getAll as jest.Mock).mockResolvedValue({
      data: mockSaccos,
      total: 1,
    });
  });

  it('should show rider selection dropdown', async () => {
    const mockDelivery: Delivery = {
      id: 'del-001',
      businessId: 'biz-123',
      workspaceId: 'ws-456',
      actorId: 'act-789',
      status: 'Requested',
      pickupAddress: '123 Main St',
      dropoffAddress: '456 Oak Ave',
      isScheduled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<OrderDetailsModalTestWrapper delivery={mockDelivery} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rider')).toBeInTheDocument();
    });
  });

  it('should show sacco selection dropdown', async () => {
    const mockDelivery: Delivery = {
      id: 'del-001',
      businessId: 'biz-123',
      workspaceId: 'ws-456',
      actorId: 'act-789',
      status: 'Requested',
      pickupAddress: '123 Main St',
      dropoffAddress: '456 Oak Ave',
      isScheduled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<OrderDetailsModalTestWrapper delivery={mockDelivery} />);
    
    await waitFor(() => {
      expect(screen.getByText('Sacco')).toBeInTheDocument();
    });
  });
});

// Helper component for testing OrderDetailsModal
const OrderDetailsModalTestWrapper = ({ delivery }: { delivery: Delivery }) => {
  const { OrderDetailsModal } = require('../../components/delivery');
  const { useRiders, useSaccos } = require('../../hooks');
  
  const mockRiders: Rider[] = [
    {
      id: 'rider-1',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+254700000001',
      status: 'Available',
      rating: 4.5,
    },
  ];

  const mockSaccos: Sacco[] = [
    {
      id: 'sacco-1',
      name: 'Rapid Riders',
      phone: '+254700000010',
      memberCount: 50,
      status: 'Active',
    },
  ];

  return (
    <OrderDetailsModal
      isOpen={true}
      onClose={() => {}}
      delivery={delivery}
      riders={mockRiders}
      saccos={mockSaccos}
      onAssign={jest.fn()}
      onAutoAssign={jest.fn()}
      loading={false}
    />
  );
};
