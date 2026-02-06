import { randomBytes, randomUUID } from 'node:crypto'

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager, Repository } from 'typeorm'

import { DeliveryResponse, DeliveryStatus } from '../../../../../../packages/contracts/src'
import { DeliveryEntity } from '../entities/delivery.entity'

export interface CreateScheduledDeliveryInput {
  businessId: string
  pickupLocationId?: string | null
  dropoffLocationId?: string | null
  scheduledPickupTime: Date
  scheduledDropoffTime?: Date | null
  visibilityToken?: string
}

export interface CreateOnDemandDeliveryInput {
  businessId: string
  pickupLocationId?: string | null
  dropoffLocationId?: string | null
  visibilityToken?: string
}

export interface DeliveryStopInput {
  sequence: number
  type: 'pickup' | 'dropoff' | 'waypoint'
  locationId: string
  scheduledTime?: Date | null
  notes?: string | null
}

export interface UpdateStatusTimestamps {
  assignedAt?: Date | null
  assignmentNotifiedAt?: Date | null
  pickedUpAt?: Date | null
  deliveredAt?: Date | null
  cancelledAt?: Date | null
}

@Injectable()
export class DeliveryService {
  private readonly _logger = new Logger(DeliveryService.name)

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async createScheduled(input: CreateScheduledDeliveryInput): Promise<DeliveryResponse> {
    this._logger.debug(`Creating scheduled delivery businessId=${input.businessId}`)
    const entity: DeliveryEntity = Object.assign(new DeliveryEntity(), {
      id: randomUUID(),
      businessId: input.businessId,
      pickupLocationId: input.pickupLocationId ?? null,
      dropoffLocationId: input.dropoffLocationId ?? null,
      status: DeliveryStatus.Requested,
      scheduledPickupTime: input.scheduledPickupTime,
      scheduledDropoffTime: input.scheduledDropoffTime ?? null,
      isScheduled: true,
      visibilityToken: input.visibilityToken ?? this.generateVisibilityToken(),
      assignedRiderId: null,
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
      trackingCode: null,
      trackingUrl: null,
    })

    const saved = await this.deliveryRepo.save(entity)
    return this.toResponse(saved)
  }

  async createOnDemand(input: CreateOnDemandDeliveryInput): Promise<DeliveryResponse> {
    this._logger.debug(`Creating on-demand delivery businessId=${input.businessId}`)
    const entity: DeliveryEntity = Object.assign(new DeliveryEntity(), {
      id: randomUUID(),
      businessId: input.businessId,
      pickupLocationId: input.pickupLocationId ?? null,
      dropoffLocationId: input.dropoffLocationId ?? null,
      status: DeliveryStatus.Requested,
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      isScheduled: false,
      visibilityToken: input.visibilityToken ?? this.generateVisibilityToken(),
      assignedRiderId: null,
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
      trackingCode: null,
      trackingUrl: null,
    })

    const saved = await this.deliveryRepo.save(entity)
    return this.toResponse(saved)
  }

  async linkOrders(deliveryId: string, orderIds: string[]): Promise<void> {
    this._logger.debug(`Linking ${orderIds.length} orders to deliveryId=${deliveryId}`)
    if (!orderIds.length) return

    await this.dataSource.transaction(async (manager: EntityManager) => {
      for (let i = 0; i < orderIds.length; i++) {
        const orderId = orderIds[i]
        const id = randomUUID()
        await manager.query(
          `
          INSERT INTO "delivery_orders" ("id", "deliveryId", "orderId", "sequence")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("deliveryId","orderId") DO NOTHING
          `,
          [id, deliveryId, orderId, i],
        )
      }
    })
  }

  async addStops(deliveryId: string, stops: DeliveryStopInput[]): Promise<void> {
    this._logger.debug(`Adding ${stops.length} stops to deliveryId=${deliveryId}`)
    if (!stops.length) return

    await this.dataSource.transaction(async (manager: EntityManager) => {
      for (const stop of stops) {
        const id = randomUUID()
        await manager.query(
          `
          INSERT INTO "delivery_stops"
            ("id", "deliveryId", "sequence", "type", "locationId", "scheduledTime", "notes")
          VALUES
            ($1,  $2,           $3,        $4,     $5,           $6,              $7)
          `,
          [
            id,
            deliveryId,
            stop.sequence,
            stop.type,
            stop.locationId,
            stop.scheduledTime ?? null,
            stop.notes ?? null,
          ],
        )
      }
    })
  }

  async assignRider(deliveryId: string, riderId: string, notifyAssignment = false): Promise<DeliveryResponse> {
    this._logger.debug(`Assigning riderId=${riderId} to deliveryId=${deliveryId} notify=${notifyAssignment}`)
    const now = new Date()
    const patch: Partial<DeliveryEntity> = {
      assignedRiderId: riderId,
      assignedAt: now,
    }
    if (notifyAssignment) {
      patch.assignmentNotifiedAt = now
    }
    await this.deliveryRepo.update({ id: deliveryId }, patch)
    const updated = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })
    return this.toResponse(updated)
  }

  async updateStatus(
    deliveryId: string,
    status: DeliveryStatus,
    timestamps: UpdateStatusTimestamps = {},
  ): Promise<DeliveryResponse> {
    this._logger.debug(`Updating deliveryId=${deliveryId} to status=${status}`)
    const patch: Partial<DeliveryEntity> = {
      status,
    }

    if (typeof timestamps.assignedAt !== 'undefined') patch.assignedAt = timestamps.assignedAt
    if (typeof timestamps.assignmentNotifiedAt !== 'undefined')
      patch.assignmentNotifiedAt = timestamps.assignmentNotifiedAt
    if (typeof timestamps.pickedUpAt !== 'undefined') patch.pickedUpAt = timestamps.pickedUpAt
    if (typeof timestamps.deliveredAt !== 'undefined') patch.deliveredAt = timestamps.deliveredAt
    if (typeof timestamps.cancelledAt !== 'undefined') patch.cancelledAt = timestamps.cancelledAt

    await this.deliveryRepo.update({ id: deliveryId }, patch)
    const updated = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })
    return this.toResponse(updated)
  }

  async recordAttemptFailure(deliveryId: string, _reason: string): Promise<void> {
    this._logger.warn(`Recording failed attempt for deliveryId=${deliveryId} reason=${_reason}`)
    const now = new Date()
    const current = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })
    const firstAttemptAt = current.firstAttemptAt ?? now
    const attemptCount = (current.attemptCount ?? 0) + 1

    await this.deliveryRepo.update(
      { id: deliveryId },
      {
        firstAttemptAt,
        lastAttemptAt: now,
        attemptCount,
      },
    )
  }

  async getPublicViewByToken(token: string): Promise<DeliveryResponse | null> {
    this._logger.debug(`Fetching delivery by visibility token`)
    const delivery = await this.deliveryRepo.findOne({
      where: { visibilityToken: token },
    })
    return delivery ? this.toResponse(delivery) : null
  }

  private toResponse(entity: DeliveryEntity): DeliveryResponse {
    return {
      deliveryId: entity.id,
      businessId: entity.businessId,
      pickupLocationId: entity.pickupLocationId as string,
      dropoffLocationId: entity.dropoffLocationId as string,
      assignedRiderId: entity.assignedRiderId,
      status: entity.status,
      scheduledPickupTime: entity.scheduledPickupTime ?? null,
      scheduledDropoffTime: entity.scheduledDropoffTime ?? null,
      isScheduled: entity.isScheduled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }

  private generateVisibilityToken(): string {
    return randomBytes(24).toString('hex')
  }
}
