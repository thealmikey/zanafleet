import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LocationResolverService } from '../../../../core/location/location-resolver.service';
import { SendNotificationCommand } from '../../../communication/commands/send-notification.command';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { AssignmentRulesService } from '../../services/assignment-rules.service';
import { CandidateSelectionService } from '../../services/candidate-selection.service';
import { DeliveryScheduledSubscriber } from '../../subscribers/delivery-scheduled.subscriber';

describe('DeliveryScheduledSubscriber', () => {
  let subscriber: DeliveryScheduledSubscriber;
  let repo: jest.Mocked<Repository<DeliveryEntity>>;
  let candidateSelection: { findAndRankCandidates: jest.Mock };
  let rules: { shouldNotifyEarlyAssignment: jest.Mock };
  let commandBus: { execute: jest.Mock };
  let locationResolver: { resolveToPoint: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOneBy: jest.fn(),
    } as unknown as jest.Mocked<Repository<DeliveryEntity>>;

    candidateSelection = {
      findAndRankCandidates: jest.fn(),
    };

    rules = {
      shouldNotifyEarlyAssignment: jest.fn(),
    };

    commandBus = {
      execute: jest.fn(),
    };

    locationResolver = {
      resolveToPoint: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryScheduledSubscriber,
        { provide: getRepositoryToken(DeliveryEntity), useValue: repo },
        { provide: CandidateSelectionService, useValue: candidateSelection },
        { provide: AssignmentRulesService, useValue: rules },
        { provide: CommandBus, useValue: commandBus },
        { provide: LocationResolverService, useValue: locationResolver },
      ],
    }).compile();

    subscriber = moduleRef.get(DeliveryScheduledSubscriber);
  });

  it('invokes candidate selection and sends notifications when rules pass', async () => {
    const delivery: DeliveryEntity = Object.assign(new DeliveryEntity(), {
      id: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
    });
    repo.findOneBy.mockResolvedValue(delivery);

    locationResolver.resolveToPoint.mockResolvedValue({
      latitude: -1.29,
      longitude: 36.82,
    });

    candidateSelection.findAndRankCandidates.mockResolvedValue([
      {
        riderId: 'r-1',
        lastKnownLocation: { latitude: -1.29, longitude: 36.82 },
        distanceMeters: 120,
        score: 0.9,
      },
      {
        riderId: 'r-2',
        lastKnownLocation: { latitude: -1.3, longitude: 36.83 },
        distanceMeters: 350,
        score: 0.7,
      },
    ]);

    rules.shouldNotifyEarlyAssignment.mockReturnValue(true);

    const scheduledAt = new Date('2025-03-01T10:00:00.000Z').toISOString();
    const payload = {
      eventId: 'e-1',
      eventType: 'Delivery.Delivery.ScheduledV1',
      eventVersion: '1.0.0',
      occurredAt: new Date('2025-03-01T09:59:00.000Z').toISOString(),
      aggregateId: 'd-1',
      aggregateType: 'Delivery',
      deliveryId: 'd-1',
      businessId: 'b-1',
      scheduledPickupTime: scheduledAt,
      scheduledDropoffTime: null,
      itemSummary: '2 items',
      correlationId: 'corr-1',
      causationId: 'caus-1',
    };

    await subscriber.handleDeliveryScheduled(payload as any, {} as any);

    // Candidate matching is invoked with resolved GeoPoint and timing
    expect(candidateSelection.findAndRankCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        pickup: { latitude: -1.29, longitude: 36.82 },
        scheduledPickupTime: expect.any(Date),
        scheduledDropoffTime: null,
        now: expect.any(Date),
      })
    );

    // At least one notification is sent via CommandBus
    expect(commandBus.execute).toHaveBeenCalled();
    const [firstCall] = commandBus.execute.mock.calls;
    expect(firstCall[0]).toBeInstanceOf(SendNotificationCommand);
    const cmd = firstCall[0] as SendNotificationCommand;
    expect((cmd as any).recipientId).toBe('r-1');
  });
});
