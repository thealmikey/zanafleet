/**
 * Neo4j Query Pack
 *
 * Parameterized Cypher queries for ZanaFleet graph operations.
 * All queries are compatible with Neo4j Aura (no APOC required).
 *
 * Query Categories:
 * - actors.queries: Actor node lookups and capability checks
 * - riders.queries: Rider performance and commitment queries
 * - businesses.queries: Business capability and geo queries
 * - workspaces.queries: Workspace membership and density queries
 * - hierarchy.queries: Admin-scoped ID lookups for dashboard filtering
 */

export * from './riders.queries';
export * from './businesses.queries';
export * from './actors.queries';
export * from './workspaces.queries';
export * from './hierarchy.queries';

// Re-export commonly used admin-scoped queries for convenience
export {
  ADMIN_SCOPED_BUSINESS_IDS,
  ADMIN_SCOPED_SACCO_IDS,
  ADMIN_SCOPED_RIDER_IDS,
} from './hierarchy.queries';
