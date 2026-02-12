import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripEntity } from '../entities/trip.entity';
import { PolicyTrigger } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';
import { PolicyEvaluationEngineService } from '../../policy/services/policy-evaluation-engine.service';
import { CommandBus } from '@nestjs/cqrs';
import { RecordLedgerEntryCommand } from '../../ledger/commands/record-ledger-entry.command';
import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../ledger/dto/ledger.enums';

@Injectable()
export class TripService {
    private readonly logger = new Logger(TripService.name);

    constructor(
        @InjectRepository(TripEntity)
        private readonly tripRepository: Repository<TripEntity>,
        private readonly policyEngine: PolicyEvaluationEngineService,
        private readonly commandBus: CommandBus,
    ) { }

    /**
     * Start an asset trip
     * Validates against Policy Engine before proceeding
     */
    async startTrip(assetId: string, operatorId: string, workspaceId: string) {
        this.logger.log(`Starting trip for asset ${assetId} by operator ${operatorId}`);

        // Step 1: Policy validation (e.g., check if operator is certified for this asset)
        const evaluation = await this.policyEngine.evaluate({
            trigger: PolicyTrigger.RIDER_ASSIGNMENT, // Using RIDER_ASSIGNMENT as a proxy for OPERATOR_ASSIGNMENT
            workspaceId,
            timestamp: new Date(),
            metadata: {
                operatorId,
                assetId,
                resourceType: 'Asset', // Moving to metadata
            },
        });

        if (evaluation.finalDecision.effect === 'BLOCK') {
            this.logger.warn(`Trip blocked by policy: ${evaluation.finalDecision.reason}`);
            throw new Error(`Trip creation blocked: ${evaluation.finalDecision.reason}`);
        }

        const tripId = uuidv4();
        const trip = new TripEntity();
        trip.id = tripId;
        trip.assetId = assetId;
        trip.operatorId = operatorId;
        trip.startTime = new Date();

        await this.tripRepository.save(trip);
        return trip;
    }

    /**
     * End an asset trip and trigger revenue distribution
     */
    async endTrip(tripId: string, data: {
        distanceMeters: number;
        earnings: number;
        rating: number;
        currency?: string;
        operatorWalletId: string;
        platformWalletId: string;
    }) {
        const trip = await this.tripRepository.findOne({ where: { id: tripId } });
        if (!trip) throw new Error('Trip not found');

        trip.endTime = new Date();
        trip.distanceMeters = data.distanceMeters;
        trip.earnings = data.earnings;
        trip.rating = data.rating;

        await this.tripRepository.save(trip);
        this.logger.log(`Trip ${tripId} completed. distance: ${data.distanceMeters}m, earnings: ${data.earnings}`);

        // Step 2: Record financial entries in the ledger
        const platformAmount = data.earnings * 0.15; // 15% Platform fee
        const operatorAmount = data.earnings * 0.85; // 85% Operator payout
        const currency = data.currency || 'KES';

        await this.commandBus.execute(new RecordLedgerEntryCommand({
            referenceType: LedgerReferenceType.TRIP,
            referenceId: tripId,
            entries: [
                {
                    accountId: data.platformWalletId,
                    entryType: LedgerEntryType.CREDIT,
                    category: LedgerCategory.PLATFORM_FEE,
                    amount: platformAmount,
                    currency,
                    description: `Platform fee for trip ${tripId}`,
                },
                {
                    accountId: data.operatorWalletId,
                    entryType: LedgerEntryType.CREDIT,
                    category: LedgerCategory.ASSET_UTILIZATION,
                    amount: operatorAmount,
                    currency,
                    description: `Operator payout for trip ${tripId}`,
                },
                // Balancing entry from Escrow or Customer 
                // (Simplified for demo as we don't have the full payment source here)
                {
                    accountId: uuidv4(), // Mocking the source account for balancing
                    entryType: LedgerEntryType.DEBIT,
                    category: LedgerCategory.DELIVERY_FEE,
                    amount: data.earnings,
                    currency,
                    description: `Total revenue for trip ${tripId}`,
                }
            ]
        }));

        return trip;
    }
}
