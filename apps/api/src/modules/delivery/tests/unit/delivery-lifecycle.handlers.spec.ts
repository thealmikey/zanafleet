import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../../core/event-bus';
import { NatsSubjects } from '../../../../core/event-bus/event-bus.constants';
import { AcceptDeliveryAssignmentCommand } from '../../commands/accept-delivery-assignment.command';
import { AssignRiderToDeliveryCommand } from '../../commands/assign-rider-to-delivery.command';
import { CancelDeliveryCommand } from '../../commands/cancel-delivery.command';
import { MarkDeliveryDeliveredCommand } from '../../commands/mark-delivery-delivered.command';
import { MarkDeliveryInTransitCommand } from '../../commands/mark-delivery-in-transit.command';
import { MarkDeliveryPickedUpCommand } from '../../commands/mark-delivery-picked-up.command';
import { RecordDeliveryAttemptFailedCommand } from '../../commands/record-delivery-attempt-failed.command';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { DeliveryAssignedEventV1 } from '../../events/delivery-assigned.event';
import { DeliveryCancelledEventV1 } from '../../events/delivery-cancelled.event';
import { DeliveryDeliveredEventV1 } from '../../events/delivery-delivered.event';
import { DeliveryFailedEventV1 } from '../../events/delivery-failed.event';
import { DeliveryInTransitEventV1 } from '../../events/delivery-in-transit.event';
import { DeliveryPickedUpEventV1 } from '../../events/delivery-picked-up.event';
import { AcceptDeliveryAssignmentHandler } from '../../handlers/accept-delivery-assignment.handler';
import { AssignRiderToDeliveryHandler } from '../../handlers/assign-rider-to-delivery.handler';
import { CancelDeliveryHandler } from '../../handlers/cancel-delivery.handler';
import { MarkDeliveryDeliveredHandler } from '../../handlers/mark-delivery-delivered.handler';
import { MarkDeliveryInTransitHandler } from '../../handlers/mark-delivery-in-transit.handler';
import { MarkDeliveryPickedUpHandler } from '../../handlers/mark-delivery-picked-up.handler';
import { RecordDeliveryAttemptFailedHandler } from '../../handlers/record-delivery-attempt-failed.handler';
import { DeliveryService } from '../../services/delivery.service';

describe('Delivery Lifecycle Command Handlers', () => {
  let repo: jest.Mocked<Repository<DeliveryEntity>>;
  let service: {
    assignRider: jest.Mock;
    updateStatus: jest.Mock;
    recordAttemptFailure: jest.Mock;
  };
  let eventBus: { publish: jest.Mock; publishEvent: jest.Mock; isReady: jest.Mock };

  let assignHandler: AssignRiderToDeliveryHandler;
  let acceptHandler: AcceptDeliveryAssignmentHandler;
  let pickedUpHandler: MarkDeliveryPickedUpHandler;
  let inTransitHandler: MarkDeliveryInTransitHandler;
  let deliveredHandler: MarkDeliveryDeliveredHandler;
  let cancelHandler: CancelDeliveryHandler;
  let failedHandler: RecordDeliveryAttemptFailedHandler;

  beforeEach(async () => {
    repo = {
      findOneByOrFail: jest.fn(),
    } as unknown as jest.Mocked<Repository<DeliveryEntity>>;

    service = {
      assignRider: jest.fn(),
      updateStatus: jest.fn(),
      recordAttemptFailure: jest.fn(),
    };

    eventBus = {
      publish: jest.fn(),
      publishEvent: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: getRepositoryToken(DeliveryEntity), useValue: repo },
        { provide: DeliveryService, useValue: service },
        { provide: EventBusService, useValue: eventBus },
        AssignRiderToDeliveryHandler,
        AcceptDeliveryAssignmentHandler,
        MarkDeliveryPickedUpHandler,
        MarkDeliveryInTransitHandler,
        MarkDeliveryDeliveredHandler,
        CancelDeliveryHandler,
        RecordDeliveryAttemptFailedHandler,
      ],
    }).compile();

    assignHandler = moduleRef.get(AssignRiderToDeliveryHandler);
    acceptHandler = moduleRef.get(AcceptDeliveryAssignmentHandler);
    pickedUpHandler = moduleRef.get(MarkDeliveryPickedUpHandler);
    inTransitHandler = moduleRef.get(MarkDeliveryInTransitHandler);
    deliveredHandler = moduleRef.get(MarkDeliveryDeliveredHandler);
    cancelHandler = moduleRef.get(CancelDeliveryHandler);
    failedHandler = moduleRef.get(RecordDeliveryAttemptFailedHandler);
  });

  function baseEntity(overrides: Partial<DeliveryEntity> = {}): DeliveryEntity {
    return Object.assign(new DeliveryEntity(), {
      id: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: null,
      status: DeliveryStatus.Requested,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      assignedAt: null,
      assignmentNotifiedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      firstAttemptAt: null,
      lastAttemptAt: null,
      attemptCount: 0,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      ...overrides,
    });
  }

  it('assigns rider and publishes DeliveryAssignedEventV1', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(baseEntity()) // before
      .mockResolvedValueOnce(
        baseEntity({
          assignedRiderId: 'r-1',
          assignedAt: new Date('2025-01-01T00:10:00.000Z'),
          status: DeliveryStatus.Assigned,
        })
      ); // after

    service.assignRider.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.Assigned,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:10:00.000Z'),
    });

    service.updateStatus.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.Assigned,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:10:00.000Z'),
    });

    await assignHandler.execute(new AssignRiderToDeliveryCommand('d-1', 'r-1'));

    expect(service.assignRider).toHaveBeenCalledWith('d-1', 'r-1', false);
    expect(service.updateStatus).toHaveBeenCalledWith('d-1', DeliveryStatus.Assigned);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.ASSIGNED_V1);
    expect(evt).toBeInstanceOf(DeliveryAssignedEventV1);
    expect((evt as DeliveryAssignedEventV1).toJSON().assignedRiderId).toBe('r-1');
  });

  it('accepts delivery assignment and publishes DeliveryAssignedEventV1 with accepted=true', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(
        baseEntity({ assignedRiderId: 'r-1', assignedAt: new Date('2025-01-01T00:05:00.000Z') })
      ) // before
      .mockResolvedValueOnce(
        baseEntity({
          assignedRiderId: 'r-1',
          assignedAt: new Date('2025-01-01T00:05:00.000Z'),
          assignmentNotifiedAt: new Date('2025-01-01T00:06:00.000Z'),
          status: DeliveryStatus.Assigned,
        })
      ); // after

    service.assignRider.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.Assigned,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:06:00.000Z'),
    });

    await acceptHandler.execute(new AcceptDeliveryAssignmentCommand('d-1', 'r-1'));

    expect(service.assignRider).toHaveBeenCalledWith('d-1', 'r-1', true);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.ASSIGNED_V1);
    expect(evt).toBeInstanceOf(DeliveryAssignedEventV1);
    expect((evt as DeliveryAssignedEventV1).toJSON().accepted).toBe(true);
  });

  it('marks delivery picked up and publishes DeliveryPickedUpEventV1', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(baseEntity({ status: DeliveryStatus.Assigned })) // before
      .mockResolvedValueOnce(
        baseEntity({
          status: DeliveryStatus.PickedUp,
          pickedUpAt: new Date('2025-01-01T00:20:00.000Z'),
        })
      ); // after

    service.updateStatus.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.PickedUp,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:20:00.000Z'),
    });

    await pickedUpHandler.execute(new MarkDeliveryPickedUpCommand('d-1'));

    expect(service.updateStatus).toHaveBeenCalledWith(
      'd-1',
      DeliveryStatus.PickedUp,
      expect.objectContaining({ pickedUpAt: expect.any(Date) })
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.PICKED_UP_V1);
    expect(evt).toBeInstanceOf(DeliveryPickedUpEventV1);
  });

  it('marks delivery in transit and publishes DeliveryInTransitEventV1', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(baseEntity({ status: DeliveryStatus.PickedUp })) // before
      .mockResolvedValueOnce(baseEntity({ status: DeliveryStatus.InTransit })); // after

    service.updateStatus.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.InTransit,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:30:00.000Z'),
    });

    await inTransitHandler.execute(new MarkDeliveryInTransitCommand('d-1'));

    expect(service.updateStatus).toHaveBeenCalledWith('d-1', DeliveryStatus.InTransit);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.IN_TRANSIT_V1);
    expect(evt).toBeInstanceOf(DeliveryInTransitEventV1);
  });

  it('marks delivery delivered and publishes DeliveryDeliveredEventV1', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(baseEntity({ status: DeliveryStatus.InTransit })) // before
      .mockResolvedValueOnce(
        baseEntity({
          status: DeliveryStatus.Delivered,
          deliveredAt: new Date('2025-01-01T00:45:00.000Z'),
        })
      ); // after

    service.updateStatus.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.Delivered,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:45:00.000Z'),
    });

    await deliveredHandler.execute(new MarkDeliveryDeliveredCommand('d-1'));

    expect(service.updateStatus).toHaveBeenCalledWith(
      'd-1',
      DeliveryStatus.Delivered,
      expect.objectContaining({ deliveredAt: expect.any(Date) })
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.DELIVERED_V1);
    expect(evt).toBeInstanceOf(DeliveryDeliveredEventV1);
  });

  it('cancels delivery and publishes DeliveryCancelledEventV1', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(baseEntity({ status: DeliveryStatus.Requested })) // before
      .mockResolvedValueOnce(
        baseEntity({
          status: DeliveryStatus.Cancelled,
          cancelledAt: new Date('2025-01-01T00:50:00.000Z'),
        })
      ); // after

    service.updateStatus.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: 'r-1',
      status: DeliveryStatus.Cancelled,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:50:00.000Z'),
    });

    await cancelHandler.execute(new CancelDeliveryCommand('d-1', 'customer-requested'));

    expect(service.updateStatus).toHaveBeenCalledWith(
      'd-1',
      DeliveryStatus.Cancelled,
      expect.objectContaining({ cancelledAt: expect.any(Date) })
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.CANCELLED_V1);
    expect(evt).toBeInstanceOf(DeliveryCancelledEventV1);
    expect((evt as DeliveryCancelledEventV1).toJSON().reason).toBe('customer-requested');
  });

  it('records failed attempt and publishes DeliveryFailedEventV1', async () => {
    repo.findOneByOrFail
      .mockResolvedValueOnce(baseEntity()) // before
      .mockResolvedValueOnce(
        baseEntity({ attemptCount: 1, lastAttemptAt: new Date('2025-01-01T01:00:00.000Z') })
      ); // after

    await failedHandler.execute(new RecordDeliveryAttemptFailedCommand('d-1', 'no-answer'));

    expect(service.recordAttemptFailure).toHaveBeenCalledWith('d-1', 'no-answer');
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [subject, evt] = eventBus.publish.mock.calls[0];
    expect(subject).toBe(NatsSubjects.Delivery.FAILED_V1);
    expect(evt).toBeInstanceOf(DeliveryFailedEventV1);
    expect((evt as DeliveryFailedEventV1).toJSON().attemptCount).toBe(1);
  });

  it('is idempotent: delivering an already Delivered delivery publishes nothing', async () => {
    repo.findOneByOrFail.mockResolvedValue(baseEntity({ status: DeliveryStatus.Delivered }));

    await deliveredHandler.execute(new MarkDeliveryDeliveredCommand('d-1'));

    expect(service.updateStatus).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
