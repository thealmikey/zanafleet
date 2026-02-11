import React, { useState, useCallback } from 'react';
import { useDeliveries, useRiders, useSaccos } from '../hooks';
import {
  CreateOrderForm,
  OrdersList,
  OrderDetailsModal,
} from '../components/delivery';
import { Button } from '../components/ui';
import { Delivery, Rider, Sacco, DeliveryFilters } from '../types';

// Mock auth context - replace with actual auth implementation
const useAuth = () => {
  return {
    businessId: 'business-123',
    workspaceId: 'workspace-456',
    actorId: 'actor-789',
  };
};

export function DeliveryDashboard(): React.ReactElement {
  const { businessId, workspaceId, actorId } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch deliveries
  const {
    deliveries,
    loading: deliveriesLoading,
    error: deliveriesError,
    total,
    totalPages,
    params,
    setPage,
    setFilters,
    refresh: refreshDeliveries,
  } = useDeliveries({ page: 1, limit: 10 });

  // Fetch riders
  const { riders, loading: ridersLoading, refresh: refreshRiders } = useRiders({
    page: 1,
    limit: 100,
  });

  // Fetch saccos
  const { saccos, loading: saccosLoading, refresh: refreshSaccos } = useSaccos({
    page: 1,
    limit: 100,
  });

  const handleViewDetails = useCallback((delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedDelivery(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    refreshDeliveries();
    setShowCreateModal(false);
  }, [refreshDeliveries]);

  const handleAssign = useCallback(
    async (deliveryId: string, riderId?: string, saccoId?: string) => {
      // This would call the actual API
      console.log('Assigning delivery:', deliveryId, { riderId, saccoId });
      await refreshDeliveries();
    },
    [refreshDeliveries]
  );

  const handleAutoAssign = useCallback(
    async (deliveryId: string) => {
      // This would call the actual auto-assign API
      console.log('Auto-assigning delivery:', deliveryId);
      await refreshDeliveries();
    },
    [refreshDeliveries]
  );

  const handleFilterChange = useCallback(
    (filters: Partial<DeliveryFilters>) => {
      setFilters(filters);
    },
    [setFilters]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delivery Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage delivery orders
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Order
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {deliveriesError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading deliveries
                </h3>
                <p className="mt-1 text-sm text-red-700">{deliveriesError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Orders
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {total}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Requested
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-blue-600">
                {deliveries.filter((d) => d.status === 'Requested').length}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                In Transit
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-600">
                {deliveries.filter((d) => d.status === 'InTransit').length}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Delivered
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">
                {deliveries.filter((d) => d.status === 'Delivered').length}
              </dd>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Orders</h2>
          </div>
          <OrdersList
            deliveries={deliveries}
            loading={deliveriesLoading}
            total={total}
            page={params.page}
            totalPages={totalPages}
            filters={params}
            onViewDetails={handleViewDetails}
            onFilterChange={handleFilterChange}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Create Order Modal */}
      <CreateOrderForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        businessId={businessId}
        workspaceId={workspaceId}
        actorId={actorId}
      />

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={detailModalOpen}
        onClose={handleCloseDetails}
        delivery={selectedDelivery}
        riders={riders}
        saccos={saccos}
        onAssign={handleAssign}
        onAutoAssign={handleAutoAssign}
        loading={ridersLoading || saccosLoading}
      />
    </div>
  );
}
