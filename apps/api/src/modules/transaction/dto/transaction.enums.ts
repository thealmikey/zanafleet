/**
 * Transaction Type Enum
 * Defines the types of transactions supported in ZanaFleet
 */
export enum TransactionType {
  Settlement = 'settlement',
  Reward = 'reward',
  Fee = 'fee',
  Penalty = 'penalty',
}

/**
 * Transaction Status Enum
 * Defines the lifecycle status of a transaction
 */
export enum TransactionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
}
