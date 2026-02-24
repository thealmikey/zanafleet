import { BaseEvent, AssetType, AssetStatus, OwnerType, LocationData } from '@zanafleet/contracts';

/**
 * AssetCreatedEventV1
 * Published when a generic asset is registered in the ZanaFleet platform.
 */
export class AssetCreatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Asset.AssetCreated.v1';
  readonly eventVersion = '1.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';

  readonly assetId: string;
  readonly name: string;
  readonly type: AssetType;
  readonly status: AssetStatus;
  readonly ownerId: string;
  readonly ownerType: OwnerType;
  readonly homeBase?: LocationData;
  readonly createdAt: Date;

  constructor(payload: {
    eventId: string;
    assetId: string;
    name: string;
    type: AssetType;
    status: AssetStatus;
    ownerId: string;
    ownerType: OwnerType;
    homeBase?: LocationData;
    createdAt: Date;
    occurredAt: Date;
  }) {
    this.eventId = payload.eventId;
    this.occurredAt = payload.occurredAt;
    this.aggregateId = payload.assetId;

    this.assetId = payload.assetId;
    this.name = payload.name;
    this.type = payload.type;
    this.status = payload.status;
    this.ownerId = payload.ownerId;
    this.ownerType = payload.ownerType;
    this.homeBase = payload.homeBase;
    this.createdAt = payload.createdAt;
  }
}
