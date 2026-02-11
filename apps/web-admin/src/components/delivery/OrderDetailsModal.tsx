import React, { useState } from 'react';
import { format } from 'date-fns';
import { Modal, Button, Badge, getStatusBadgeVariant } from '../ui';
import { RiderSelect } from './RiderSelect';
import { SaccoSelect } from './SaccoSelect';
import { Delivery, Rider, Sacco } from '../../types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  riders: Rider[];
  saccos: Sacco[];
  onAssign: (deliveryId: string, riderId?: string, saccoId?: string) => Promise<void>;
  onAutoAssign: (deliveryId: string) => Promise<void>;
  loading: boolean;
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  delivery,
  riders,
  saccos,
  onAssign,
  onAutoAssign,
  loading,
}: OrderDetailsModalProps): React.ReactElement | null {
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [selectedSaccoId, setSelectedSaccoId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  if (!delivery) return null;

  const handleManualAssign = async (): Promise<void> => {
    setAssigning(true);
    try {
      await onAssign(delivery.id, selectedRiderId || undefined, selectedSaccoId || undefined);
      setSelectedRiderId('');
      setSelectedSaccoId('');
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssign = async (): Promise<void> => {
    setAssigning(true);
    try {
      await onAutoAssign(delivery.id);
    } finally {
      setAssigning(false);
    }
  };

  const canAssign =
    delivery.status === 'Requested' || delivery.status === 'Assigned';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Order Details"
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canAssign && (
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={handleAutoAssign}
                isLoading={assigning}
              >
                Auto-Assign
              </Button>
              <Button
                onClick={handleManualAssign}
                isLoading={assigning}
                disabled={!selectedRiderId && !selectedSaccoId}
              >
                Save Assignment
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Order #{delivery.id.slice(0, 8)}</h4>
            <p className="text-sm text-gray-500">
              Created: {format(new Date(delivery.createdAt), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(delivery.status)} size="md">
            {delivery.status}
          </Badge>
        </div>

        {/* Locations */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Pickup</h5>
            <p className="text-sm text-gray-900">
              {delivery.pickupAddress || delivery.pickupLocation?.address || 'Not specified'}
            </p>
            {delivery.scheduledPickupTime && (
              <p className="text-xs text-gray-500 mt-1">
                Scheduled: {format(new Date(delivery.scheduledPickupTime), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Dropoff</h5>
            <p className="text-sm text-gray-900">
              {delivery.dropoffAddress || delivery.dropoffLocation?.address || 'Not specified'}
            </p>
            {delivery.scheduledDropoffTime && (
              <p className="text-xs text-gray-500 mt-1">
                Scheduled: {format(new Date(delivery.scheduledDropoffTime), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Package Details */}
        {delivery.packageDetails && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Package Details</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {delivery.packageDetails.weight && (
                <div>
                  <span className="text-gray-500">Weight:</span>{' '}
                  <span className="text-gray-900">{delivery.packageDetails.weight} kg</span>
                </div>
              )}
              {delivery.packageDetails.length && (
                <div>
                  <span className="text-gray-500">Dimensions:</span>{' '}
                  <span className="text-gray-900">
                    {delivery.packageDetails.length} x {delivery.packageDetails.width} x{' '}
                    {delivery.packageDetails.height} cm
                  </span>
                </div>
              )}
              {delivery.packageDetails.description && (
                <div className="col-span-2">
                  <span className="text-gray-500">Description:</span>{' '}
                  <span className="text-gray-900">{delivery.packageDetails.description}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignment Section */}
        {canAssign && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Assignment</h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <RiderSelect
                  riders={riders}
                  value={selectedRiderId}
                  onChange={setSelectedRiderId}
                  placeholder="Select a rider"
                />
              </div>
              <div>
                <SaccoSelect
                  saccos={saccos}
                  value={selectedSaccoId}
                  onChange={setSelectedSaccoId}
                  placeholder="Select a sacco"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select a rider or sacco to assign this delivery. Leave empty to auto-assign.
            </p>
          </div>
        )}

        {/* Current Assignment */}
        {(delivery.assignedRiderId || delivery.assignedSaccoId) && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Currently Assigned</h5>
            <div className="flex items-center space-x-4">
              {delivery.assignedRiderId && (
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg
                      className="h-4 w-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900">Rider</p>
                    <p className="text-xs text-gray-500">{delivery.assignedRiderId}</p>
                  </div>
                </div>
              )}
              {delivery.assignedSaccoId && (
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg
                      className="h-4 w-4 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900">Sacco</p>
                    <p className="text-xs text-gray-500">{delivery.assignedSaccoId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="border-t pt-4 text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span>Business ID:</span> <span className="font-mono">{delivery.businessId}</span>
            </div>
            <div>
              <span>Workspace ID:</span>{' '}
              <span className="font-mono">{delivery.workspaceId}</span>
            </div>
            {delivery.distanceKm && (
              <div>
                <span>Distance:</span> <span>{delivery.distanceKm} km</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
