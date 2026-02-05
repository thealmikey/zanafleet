import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TEST_ACCOUNTS, TEST_PASSWORD, TestAccount } from '@zanafleet/contracts';
import { hashPassword } from '@zanafleet/utils';
import { Repository } from 'typeorm';

import { ActorType } from '../dto/actor.enums';
import { ActorEntity } from '../entities/actor.entity';

/**
 * Seeds test accounts on application startup in dev/test mode.
 * This service is idempotent - it will not create duplicate accounts.
 * 
 * WARNING: Only runs when NODE_ENV !== 'production'
 */
@Injectable()
export class TestAccountSeederService implements OnModuleInit {
  private readonly logger = new Logger(TestAccountSeederService.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Skipping test account seeding in production');
      return;
    }

    this.logger.log('Starting test account seeding...');
    await this.seedTestAccounts();
  }

  async seedTestAccounts(): Promise<void> {
    // Hash the test password once for all accounts
    const passwordHash = await hashPassword(TEST_PASSWORD);

    let created = 0;
    let skipped = 0;

    for (const account of TEST_ACCOUNTS) {
      const exists = await this.accountExists(account.email);
      
      if (exists) {
        this.logger.debug(`Skipped existing account: ${account.email}`);
        skipped++;
        continue;
      }

      await this.createAccount(account, passwordHash);
      this.logger.debug(`Created test account: ${account.email}`);
      created++;
    }

    this.logger.log(`Test account seeding complete: ${created} created, ${skipped} skipped`);
  }

  private async accountExists(email: string): Promise<boolean> {
    const existing = await this.actorRepository.findOne({
      where: { email },
    });
    return existing !== null;
  }

  private async createAccount(account: TestAccount, passwordHash: string): Promise<void> {
    const entity = ActorEntity.fromDomain({
      actorId: account.id,
      email: account.email,
      username: account.username,
      type: account.type as ActorType,
      workspaceId: account.workspaceId,
      passwordHash,
      roles: [...account.roles],
      linkedWallets: [],
      createdAt: new Date(),
    });

    await this.actorRepository.save(entity);
  }
}
