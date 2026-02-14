import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    Index,
} from 'typeorm';

import { ActorEntity } from '../../actor/entities/actor.entity';

/**
 * Operator Entity
 * Represents the human worker profile in the asset utilization platform
 * similar to a Career Identity/LinkedIn profile for drivers and logistics workers.
 */
@Entity('operators')
@Index(['actorId'])
export class OperatorEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column('uuid')
    actorId!: string;

    @OneToOne(() => ActorEntity)
    @JoinColumn({ name: 'actor_id' })
    actor?: ActorEntity;

    @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
    skills!: string[];

    @Column('jsonb', { nullable: true })
    certifications?: Record<string, unknown>[];

    @Column('float', { default: 0 })
    reputationScore!: number;

    @Column('jsonb', { nullable: true })
    careerHistory?: Record<string, unknown>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;

    /**
     * Convert entity to domain-compatible object
     */
    toDomain() {
        return {
            operatorId: this.id,
            actorId: this.actorId,
            skills: this.skills,
            certifications: this.certifications,
            reputationScore: this.reputationScore,
            careerHistory: this.careerHistory,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
