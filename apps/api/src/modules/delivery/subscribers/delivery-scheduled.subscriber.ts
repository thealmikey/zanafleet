import { Controller, Logger } from '@nestjs/common'
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices'
import { InjectRepository } from '@nestjs/typeorm'
import { CommandBus } from '@nestjs/cqrs'
import { Repository } from 'typeorm'

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants'
import { DeliveryEntity } from '../entities/delivery.entity'
import { CandidateSelectionService } from '../services/candidate-selection.service'
import { AssignmentRulesService } from '../services/assignment-rules.service'
import { LocationResolverService } from '../../../core/location/location-resolver.service'
import { SendNotificationCommand } from '../../communication/commands/send-notification.command'
import { RecipientType } from '../../communication/dto/notification.enums'

@Controller()
export class DeliveryScheduledSubscriber {
  private readonly logger = new Logger(DeliveryScheduledSubscriber.name)

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly candidateSelection: CandidateSelectionService,
    private readonly rules: AssignmentRulesService,
    private readonly commandBus: CommandBus,
    private readonly locationResolver: LocationResolverService,
  ) {}

  @MessagePattern(NatsSubjects.Delivery.SCHEDULED_V1)
  async handleDeliveryScheduled(
    @Payload() data: Record<string, unknown>,
    @Ctx() _context: NatsContext,
  ): Promise<void> {
    try {
      const deliveryId = String(data['deliveryId'])
      const businessId = String(data['businessId'])
      const scheduledPickupTime = this.parseDateOrNull(data['scheduledPickupTime'])
      const scheduledDropoffTime = this.parseDateOrNull(data['scheduledDropoffTime'])
      const correlationId = (data['correlationId'] ?? undefined) as string | undefined
      const causationId = (data['causationId'] ?? undefined) as string | undefined

      this.logger.debug(
        `Received DeliveryScheduled event for deliveryId=${deliveryId} businessId=${businessId}`,
      )

      const delivery = await this.deliveryRepo.findOneBy({ id: deliveryId })
      if (!delivery) {
        this.logger.warn(`Delivery ${deliveryId} not found; skipping candidate discovery`)
        return
      }

      const pickupLocationId = delivery.pickupLocationId
      if (!pickupLocationId) {
        this.logger.warn(
          `Delivery ${deliveryId} has no pickupLocationId; skipping candidate discovery`,
        )
        return
      }

      const pickupPoint = await this.locationResolver.resolveToPoint(pickupLocationId)
      if (!pickupPoint) {
        this.logger.warn(
          `Failed to resolve pickupLocationId=${pickupLocationId} to GeoPoint; skipping`,
        )
        return
      }

      // Discover and rank candidates near the pickup location
      const ranked = await this.candidateSelection.findAndRankCandidates({
        pickup: { latitude: pickupPoint.latitude, longitude: pickupPoint.longitude },
        scheduledPickupTime,
        scheduledDropoffTime,
        now: new Date(),
      })

      this.logger.debug(
        `Candidate discovery for deliveryId=${deliveryId} yielded count=${ranked.length}`,
      )

      const shouldNotify = this.rules.shouldNotifyEarlyAssignment({
        isScheduled: true,
        scheduledPickupTime,
        scheduledDropoffTime,
      })

      if (!shouldNotify || ranked.length === 0) {
        this.logger.debug(
          `Early notification not allowed or no candidates found for deliveryId=${deliveryId}`,
        )
        return
      }

      // Notify top-k candidates (policy: up to 3)
      const topK = Math.min(3, ranked.length)
      const notifications = []
      for (let i = 0; i < topK; i++) {
        const candidate = ranked[i]
        const variables: Record<string, unknown> = {
          deliveryId,
          businessId,
          rank: i + 1,
          distanceMeters: candidate.distanceMeters,
          score: candidate.score,
          scheduledPickupTime: scheduledPickupTime?.toISOString() ?? null,
          scheduledDropoffTime: scheduledDropoffTime?.toISOString() ?? null,
          pickup: { latitude: pickupPoint.latitude, longitude: pickupPoint.longitude },
        }

        const cmd = new SendNotificationCommand(
          candidate.riderId,
          RecipientType.RIDER,
          'IN_APP' as any,
          'delivery.early-assignment.candidate',
          variables,
          businessId,
          correlationId,
          causationId,
        )

        notifications.push(this.commandBus.execute(cmd))
      }

      await Promise.all(notifications)
      this.logger.debug(
        `Dispatched ${notifications.length} early notifications for deliveryId=${deliveryId}`,
      )
    } catch (err) {
      this.logger.error('Failed to handle DeliveryScheduled event', err as Error)
      throw err
    }
  }

  private parseDateOrNull(input: unknown): Date | null {
    if (!input) return null
    if (input instanceof Date) return input
    const s = String(input)
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
    }
}
