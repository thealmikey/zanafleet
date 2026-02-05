import { Test, TestingModule } from '@nestjs/testing';

import { MessagingModule } from '../messaging.module';
import { MessagingService } from '../services/messaging.service';

describe('MessagingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MessagingModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide MessagingService', () => {
    const service = module.get<MessagingService>(MessagingService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(MessagingService);
  });

  it('should export MessagingService for other modules', async () => {
    const module2 = await Test.createTestingModule({
      imports: [MessagingModule],
    }).compile();

    const service = module2.get<MessagingService>(MessagingService);
    expect(service).toBeDefined();

    await module2.close();
  });
});
