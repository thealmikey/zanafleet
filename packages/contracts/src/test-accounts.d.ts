/**
 * Test account definitions for development and testing.
 * These accounts are seeded by the API in dev/test mode and recognized by MSW mock handlers.
 *
 * WARNING: These accounts should NEVER be used in production.
 */
type TestActorType =
  | 'Rider'
  | 'Driver'
  | 'Admin'
  | 'Support'
  | 'SaccoAdmin'
  | 'BusinessOwner'
  | 'Customer';
export interface TestAccount {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly type: TestActorType;
  readonly roles: readonly string[];
  readonly workspaceId: string | null;
}
export declare const TEST_PASSWORD: 'testpassword123';
export declare const TEST_WORKSPACE_ID: '550e8400-e29b-41d4-a716-446655440000';
export declare const TEST_ACCOUNTS: readonly TestAccount[];

//# sourceMappingURL=test-accounts.d.ts.map
