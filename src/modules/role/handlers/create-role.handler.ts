import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateRoleCommand } from '../commands/create-role.command';
import { RoleCreatedEventV1 } from '../events/role-created.event';
import { RoleEntity } from '../entities/role.entity';

/**
 * CreateRoleCommandHandler
 *
 * Handles the CreateRoleCommand by:
 * 1. Checking for duplicate (name, scope) combination
 * 2. Persisting to PostgreSQL
 * 3. Emitting RoleCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateRoleCommand)
@Injectable()
export class CreateRoleCommandHandler
  implements ICommandHandler<CreateRoleCommand>
{
  private readonly logger = new Logger(CreateRoleCommandHandler.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Execute command: Create role
   *
   * @param command CreateRoleCommand
   * @returns roleId of created role
   * @throws ConflictException if role with same name and scope exists
   * @throws Error if persistence fails
   */
  async execute(command: CreateRoleCommand): Promise<string> {
    const roleId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateRoleCommand for role: ${command.name} (scope: ${command.scope})`,
    );

    // Step 1: Check for duplicate (name, scope) combination
    const existingRole = await this.roleRepository.findOne({
      where: {
        name: command.name,
        scope: command.scope,
      },
    });

    if (existingRole) {
      this.logger.warn(
        `Duplicate role detected: ${command.name} with scope ${command.scope}`,
      );
      throw new ConflictException(
        `Role with name "${command.name}" and scope "${command.scope}" already exists`,
      );
    }

    try {
      // Step 2: Create role entity
      const entity = RoleEntity.fromDomain({
        roleId,
        name: command.name,
        permissions: command.permissions,
        scope: command.scope,
        createdAt: now,
      });

      // Step 3: Persist to PostgreSQL
      await this.roleRepository.save(entity);
      this.logger.debug(`Role persisted to PostgreSQL: ${roleId}`);

      // Step 4: Create and emit event
      const event = new RoleCreatedEventV1({
        eventId,
        roleId,
        name: command.name,
        permissions: command.permissions,
        scope: command.scope,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`RoleCreatedEvent-V1 emitted to event bus: ${eventId}`);

      return roleId;
    } catch (error) {
      this.logger.error(
        `Failed to create role: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
