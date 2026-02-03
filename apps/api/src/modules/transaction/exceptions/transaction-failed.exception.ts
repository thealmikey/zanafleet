import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * TransactionFailedException
 * Thrown when a transaction fails during execution
 */
export class TransactionFailedException extends HttpException {
  constructor(transactionId: string, reason: string) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Transaction Failed',
        message: `Transaction ${transactionId} failed: ${reason}`,
        transactionId,
        reason,
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
