/**
 * Test account definitions for development and testing.
 * These accounts are seeded by the API in dev/test mode and recognized by MSW mock handlers.
 *
 * WARNING: These accounts should NEVER be used in production.
 */

// Re-declare ActorType values to avoid circular import with index.ts
// These must match the ActorType enum values in index.ts
type TestActorType = 'Rider' | 'Driver' | 'Admin' | 'Support' | 'SaccoAdmin' | 'BusinessOwner' | 'Customer';

export interface TestAccount {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly type: TestActorType;
  readonly roles: readonly string[];
  readonly workspaceId: string | null;
}

export const TEST_PASSWORD = 'testpassword123' as const;

export const TEST_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440000' as const;

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test-admin@zanafleet.dev',
    username: 'test-admin',
    type: 'Admin',
    roles: ['Admin', 'SiteOwner'],
    workspaceId: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'test-support@zanafleet.dev',
    username: 'test-support',
    type: 'Support',
    roles: ['Support'],
    workspaceId: TEST_WORKSPACE_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'test-rider@zanafleet.dev',
    username: 'test-rider',
    type: 'Rider',
    roles: ['Rider'],
    workspaceId: TEST_WORKSPACE_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'test-driver@zanafleet.dev',
    username: 'test-driver',
    type: 'Driver',
    roles: ['Driver'],
    workspaceId: TEST_WORKSPACE_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'test-businessowner@zanafleet.dev',
    username: 'test-businessowner',
    type: 'BusinessOwner',
    roles: ['BusinessOwner'],
    workspaceId: TEST_WORKSPACE_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    email: 'test-saccoadmin@zanafleet.dev',
    username: 'test-saccoadmin',
    type: 'SaccoAdmin',
    roles: ['SaccoAdmin'],
    workspaceId: TEST_WORKSPACE_ID,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    email: 'test-customer@zanafleet.dev',
    username: 'test-customer',
    type: 'Customer',
    roles: ['Customer'],
    workspaceId: TEST_WORKSPACE_ID,
  },
] as const;
