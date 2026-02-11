import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Modal } from '../ui';
import { useCreateDelivery } from '../../hooks';
import { CreateDeliveryDto, DeliveryStatus } from '../../types';

// Form validation schema
const createOrderSchema = z.object({
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  dropoffAddress: z.string().min(1, 'Dropoff address is required'),
  isScheduled: z.boolean().default(false),
  scheduledPickupTime: z
    .date()
    .optional()
    .refine((date) => !date || date > new Date(), {
      message: 'Scheduled pickup time must be in the future',
    }),
  scheduledDropoffTime: z
    .date()
    .optional()
    .refine((date) => !date || date > new Date(), {
      message: 'Scheduled dropoff time must be in the future',
    }),
  packageWeight: z.number().optional(),
  packageLength: z.number().optional(),
  packageWidth: z.number().optional(),
  packageHeight: z.number().optional(),
  packageDescription: z.string().optional(),
});

type CreateOrderFormData = z.infer<typeof createOrderSchema>;

interface CreateOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
  workspaceId: string;
  actorId: string;
}

export function CreateOrderForm({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  workspaceId,
  actorId,
}: CreateOrderFormProps): React.ReactElement {
  const { create, loading, error: createError } = useCreateDelivery();
  const [scheduledMode, setScheduledMode] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      isScheduled: false,
      scheduledPickupTime: undefined,
      scheduledDropoffTime: undefined,
      packageWeight: undefined,
      packageLength: undefined,
      packageWidth: undefined,
      packageHeight: undefined,
      packageDescription: '',
    },
  });

  const watchIsScheduled = watch('isScheduled');

  const onSubmit = async (data: CreateOrderFormData): Promise<void> => {
    const dto: CreateDeliveryDto = {
      businessId,
      workspaceId,
      actorId,
      pickupAddress: data.pickupAddress,
      dropoffAddress: data.dropoffAddress,
      isScheduled: data.isScheduled,
      scheduledPickupTime: data.scheduledPickupTime,
      scheduledDropoffTime: data.scheduledDropoffTime,
      packageDetails: {
        weight: data.packageWeight,
        length: data.packageLength,
        width: data.packageWidth,
        height: data.packageHeight,
        description: data.packageDescription,
      },
    };

    await create(dto);
    reset();
    onClose();
    onSuccess();
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Delivery Order"
      size="lg"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} isLoading={loading}>
            Create Order
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {createError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{createError}</p>
          </div>
        )}

        {/* Address Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Pickup Address"
              placeholder="Enter pickup address"
              error={errors.pickupAddress?.message}
              {...register('pickupAddress')}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Dropoff Address"
              placeholder="Enter dropoff address"
              error={errors.dropoffAddress?.message}
              {...register('dropoffAddress')}
            />
          </div>
        </div>

        {/* Scheduling Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              {...register('isScheduled')}
            />
            <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
          </label>
        </div>

        {/* Scheduled Times */}
        {watchIsScheduled && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Pickup Time
              </label>
              <input
                type="datetime-local"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                {...register('scheduledPickupTime', {
                  valueAsDate: true,
                })}
              />
              {errors.scheduledPickupTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.scheduledPickupTime.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Dropoff Time
              </label>
              <input
                type="datetime-local"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                {...register('scheduledDropoffTime', {
                  valueAsDate: true,
                })}
              />
              {errors.scheduledDropoffTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.scheduledDropoffTime.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Package Details */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Package Details (Optional)
          </h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...register('packageWeight', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Input
                label="Length (cm)"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...register('packageLength', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Input
                label="Width (cm)"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...register('packageWidth', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Input
                label="Height (cm)"
                type="number"
                step="0.1"
                placeholder="0.0"
                {...register('packageHeight', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={2}
              placeholder="Package description..."
              {...register('packageDescription')}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
