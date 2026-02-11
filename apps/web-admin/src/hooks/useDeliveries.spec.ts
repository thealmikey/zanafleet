import { renderHook, waitFor } from '@testing-library/react';
import { useDeliveries, useCreateDelivery, useDelivery } from './useDeliveries';
import { deliveryApi } from '../services';

// Mock the API
jest.mock('../services', () => ({
  deliveryApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    assign: jest.fn(),
    manualAssign: jest.fn(),
  },
}));

// Mock React
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn(),
}));

describe('useDeliveries', () => {
  const mockDeliveries = [
    {
      id: 'del-1',
      businessId: 'biz-1',
      workspaceId: 'ws-1',
      actorId: 'act-1',
      status: 'Requested',
      pickupAddress: '123 Main St',
      dropoffAddress: '456 Oak Ave',
      isScheduled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'del-2',
      businessId: 'biz-1',
      workspaceId: 'ws-1',
      actorId: 'act-1',
      status: 'Assigned',
      pickupAddress: '789 Pine Rd',
      dropoffAddress: '321 Elm St',
      isScheduled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch deliveries successfully', async () => {
    const setDeliveries = jest.fn();
    const setLoading = jest.fn();
    const setTotal = jest.fn();
    const setTotalPages = jest.fn();

    (deliveryApi.getAll as jest.Mock).mockResolvedValue({
      data: mockDeliveries,
      total: 2,
      totalPages: 1,
    });

    // Setup useState mocks
    (jest.requireMock('react').useState as jest.Mock)
      .mockImplementationOnce(() => [mockDeliveries, setDeliveries]) // deliveries
      .mockImplementationOnce(() => [false, setLoading]) // loading
      .mockImplementationOnce(() => [null, jest.fn()]) // error
      .mockImplementationOnce(() => [{ page: 1, limit: 10 }, jest.fn()]) // params
      .mockImplementationOnce(() => [2, setTotal]) // total
      .mockImplementationOnce(() => [1, setTotalPages]); // totalPages

    const { result } = renderHook(() => useDeliveries());

    await waitFor(() => {
      expect(deliveryApi.getAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  it('should handle API error', async () => {
    const setError = jest.fn();
    const setLoading = jest.fn();

    (deliveryApi.getAll as jest.Mock).mockRejectedValue(new Error('API Error'));

    (jest.requireMock('react').useState as jest.Mock)
      .mockImplementationOnce(() => [[], jest.fn()]) // deliveries
      .mockImplementationOnce(() => [false, setLoading]) // loading
      .mockImplementationOnce(() => [null, setError]) // error
      .mockImplementationOnce(() => [{ page: 1, limit: 10 }, jest.fn()]) // params
      .mockImplementationOnce(() => [0, jest.fn()]) // total
      .mockImplementationOnce(() => [0, jest.fn()]); // totalPages

    const { result } = renderHook(() => useDeliveries());

    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
    });
  });
});

describe('useCreateDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create delivery successfully', async () => {
    const setLoading = jest.fn();
    const setError = jest.fn();

    (deliveryApi.create as jest.Mock).mockResolvedValue({
      id: 'new-delivery',
      status: 'Requested',
    });

    (jest.requireMock('react').useState as jest.Mock)
      .mockImplementationOnce(() => [false, setLoading]) // loading
      .mockImplementationOnce(() => [null, setError]); // error

    const { result } = renderHook(() => useCreateDelivery());

    const created = await result.current.create({
      businessId: 'biz-1',
      workspaceId: 'ws-1',
      actorId: 'act-1',
      pickupAddress: 'Test Address',
      dropoffAddress: 'Test Dropoff',
    });

    await waitFor(() => {
      expect(created.id).toBe('new-delivery');
    });
  });

  it('should handle create error', async () => {
    const setLoading = jest.fn();
    const setError = jest.fn();

    (deliveryApi.create as jest.Mock).mockRejectedValue(new Error('Create failed'));

    (jest.requireMock('react').useState as jest.Mock)
      .mockImplementationOnce(() => [false, setLoading]) // loading
      .mockImplementationOnce(() => [null, setError]); // error

    const { result } = renderHook(() => useCreateDelivery());

    await expect(
      result.current.create({
        businessId: 'biz-1',
        workspaceId: 'ws-1',
        actorId: 'act-1',
        pickupAddress: 'Test Address',
        dropoffAddress: 'Test Dropoff',
      })
    ).rejects.toThrow('Create failed');
  });
});

describe('useDelivery', () => {
  const mockDelivery = {
    id: 'del-1',
    businessId: 'biz-1',
    workspaceId: 'ws-1',
    actorId: 'act-1',
    status: 'Requested',
    pickupAddress: '123 Main St',
    dropoffAddress: '456 Oak Ave',
    isScheduled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single delivery', async () => {
    const setDelivery = jest.fn();
    const setLoading = jest.fn();
    const setError = jest.fn();

    (deliveryApi.getById as jest.Mock).mockResolvedValue(mockDelivery);

    (jest.requireMock('react').useState as jest.Mock)
      .mockImplementationOnce(() => [null, setDelivery]) // delivery
      .mockImplementationOnce(() => [false, setLoading]) // loading
      .mockImplementationOnce(() => [null, setError]); // error

    const { result } = renderHook(() => useDelivery('del-1'));

    await waitFor(() => {
      expect(result.current.delivery?.id).toBe('del-1');
    });
  });
});
