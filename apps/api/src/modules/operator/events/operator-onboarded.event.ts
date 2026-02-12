import { BaseEvent } from '@zanafleet/contracts';

/**
 * OperatorOnboardedEventV1
 * Published when a human operator (worker) profile is created in the platform.
 */
export class OperatorOnboardedEventV1 implements BaseEvent {
    readonly eventId: string;
    readonly eventType = 'Operator.OperatorOnboarded.v1';
    readonly eventVersion = '1.0';
    readonly occurredAt: Date;
    readonly aggregateId: string;
    readonly aggregateType = 'Operator';

    readonly operatorId: string;
    readonly actorId: string;
    readonly skills: string[];
    readonly reputationScore: number;
    readonly createdAt: Date;

    constructor(payload: {
        eventId: string;
        operatorId: string;
        actorId: string;
        skills: string[];
        reputationScore: number;
        createdAt: Date;
        occurredAt: Date;
    }) {
        this.eventId = payload.eventId;
        this.occurredAt = payload.occurredAt;
        this.aggregateId = payload.operatorId;

        this.operatorId = payload.operatorId;
        this.actorId = payload.actorId;
        this.skills = payload.skills;
        this.reputationScore = payload.reputationScore;
        this.createdAt = payload.createdAt;
    }
}
