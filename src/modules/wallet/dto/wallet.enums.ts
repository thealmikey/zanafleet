/**
 * Wallet Type Enum
 * Defines the types of wallets supported in ZanaFleet
 */
export enum WalletType {
  Escrow = 'escrow',
  Incentive = 'incentive',
  Settlement = 'settlement',
}

/**
 * Owner Type Enum
 * Defines the types of entities that can own a wallet
 */
export enum OwnerType {
  Actor = 'Actor',
  Workspace = 'Workspace',
  Organization = 'Organization',
}
