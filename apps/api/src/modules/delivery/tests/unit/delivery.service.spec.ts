import { Test } from '@nestjs/testing'
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { DeliveryService } from '../../services/delivery.service'
import { DeliveryEntity } from '../../entities/delivery.entity'
import { DeliveryStatus } from '../../../../../../../packages/contracts/src'

describe('DeliveryService', () => {
  let service: DeliveryService
  let repo: jest.Mocked<Repository<DeliveryEntity>>
  let dataSource: { transaction: jest.Mock }

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findOneByOrFail: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      manager: {} as any,
    } as unknown as jest.Mocked<Repository<DeliveryEntity>>

    dataSource = {
      transaction: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: getRepositoryToken(DeliveryEntity), useValue: repo },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile()

    service = moduleRef.get(DeliveryService)
  })

  it('persists a scheduled delivery', async () => {
    const now = new Date('2025-01-01T00:00:00.000Z')
    const saved: DeliveryEntity = Object.assign(new DeliveryEntity(), {
      id: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: null,
      status: DeliveryStatus.Requested,
      scheduledPickupTime: now,
      scheduledDropoffTime: new Date('2025-01-01T01:00:00.000Z'),
      isScheduled: true,
      assignedAt: null,
      assignmentNotifiedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      firstAttemptAt: null,
      lastAttemptAt: null,
      attemptCount: 0,
      slaPickupBy: null,
      slaDropoffBy: null,
      slaBreachedAt: null,
      visibilityToken: 'tok',
      trackingCode: null,
      trackingUrl: null,
      createdAt: now,
      updatedAt: now,
    })

    repo.save.mockResolvedValue(saved)

    await service.createScheduled({
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      scheduledPickupTime: now,
      scheduledDropoffTime: new Date('2025-01-01T01:00:00.000Z'),
      visibilityToken: 'tok',
    })

    expect(repo.save).toHaveBeenCalledTimes(1)
    const arg = repo.save.mock.calls[0][0] as DeliveryEntity
    expect(arg.isScheduled).toBe(true)
    expect(arg.scheduledPickupTime).toEqual(now)
    expect(arg.status).toBe(DeliveryStatus.Requested)
  })

  it('links orderIds into delivery_orders', async () => {
    const qrm: Partial<EntityManager> = {
      query: jest.fn().mockResolvedValue(undefined),
    }
    dataSource.transaction.mockImplementation(async (cb: (em: EntityManager) => Promise<void>) => {
      await cb(qrm as EntityManager)
    })

    await service.linkOrders('d-1', ['o-1', 'o-2', 'o-3'])

    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect((qrm.query as jest.Mock).mock.calls.length).toBe(3)
    for (const call of (qrm.query as jest.Mock).mock.calls) {
      expect(call[0]).toContain('"delivery_orders"')
      expect(call[0]).toContain('ON CONFLICT ("deliveryId","orderId") DO NOTHING')
    }
  })

  it('updates assignment and status timestamps', async () => {
    const existing: DeliveryEntity = Object.assign(new DeliveryEntity(), {
      id: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: null,
      status: DeliveryStatus.Requested,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    })

    repo.findOneByOrFail.mockResolvedValue(existing)

    await service.assignRider('d-1', 'r-1')

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'd-1' },
      expect.objectContaining({
        assignedRiderId: 'r-1',
        assignedAt: expect.any(Date),
      }),
    )

    const pickedUpAt = new Date('2025-01-01T00:30:00.000Z')
    repo.findOneByOrFail.mockResolvedValue({
      ...existing,
      status: DeliveryStatus.InTransit,
      pickedUpAt,
    } as DeliveryEntity)

    await service.updateStatus('d-1', DeliveryStatus.InTransit, { pickedUpAt })

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'd-1' },
      expect.objectContaining({
        status: DeliveryStatus.InTransit,
        pickedUpAt,
      }),
    )
  })
})
