import { Logger } from '@nestjs/common';

// Disable NestJS Logger output during unit tests
// This prevents expected error logs from polluting test output
Logger.overrideLogger(false);
