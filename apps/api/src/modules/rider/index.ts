/**
 * Rider Module Exports
 * Public API for the Rider module
 */

export { RiderEntity } from './entities/rider.entity';
export { VehicleType } from './dto/rider.enums';
export { CreateRiderDto } from './dto/create-rider.dto';
export { RiderResponseDto } from './dto/rider-response.dto';
export {
  CreateRiderCommand,
  CreateRiderCommandSchema,
  type CreateRiderCommandInput,
} from './commands/create-rider.command';
export { RiderOnboardedEventV1 } from './events/rider-onboarded.event';
export { CreateRiderCommandHandler } from './handlers/create-rider.handler';
export { RiderNeo4jProjection, RiderNeo4jInitializer } from './projections/rider-neo4j.projection';
export { RiderController } from './controllers/rider.controller';
export { RiderModule } from './rider.module';
