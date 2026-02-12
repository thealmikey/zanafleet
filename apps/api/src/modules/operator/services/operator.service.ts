import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorEntity } from '../entities/operator.entity';

@Injectable()
export class OperatorService {
    private readonly logger = new Logger(OperatorService.name);

    constructor(
        @InjectRepository(OperatorEntity)
        private readonly operatorRepository: Repository<OperatorEntity>,
    ) { }

    /**
     * Update operator reputation using a weighted moving average
     */
    async updateReputation(operatorId: string, rating: number): Promise<void> {
        const operator = await this.operatorRepository.findOne({ where: { id: operatorId } });
        if (!operator) {
            this.logger.warn(`Attempted to update reputation for non-existent operator: ${operatorId}`);
            return;
        }

        // Heuristic: 90% weight on old score, 10% on new rating
        const oldScore = operator.reputationScore;
        operator.reputationScore = Number(((oldScore * 0.9) + (rating * 0.1)).toFixed(2));

        await this.operatorRepository.save(operator);
        this.logger.log(`Updated operator ${operatorId} reputation: ${oldScore} -> ${operator.reputationScore}`);
    }

    /**
     * Add a skill to the operator's career profile
     */
    async addSkill(operatorId: string, skill: string): Promise<void> {
        const operator = await this.operatorRepository.findOne({ where: { id: operatorId } });
        if (!operator) return;

        if (!operator.skills.includes(skill)) {
            operator.skills.push(skill);
            await this.operatorRepository.save(operator);
        }
    }
}
