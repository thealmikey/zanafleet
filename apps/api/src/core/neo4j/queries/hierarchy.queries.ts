/**
 * Hierarchy Queries for Admin Dashboard
 *
 * Neo4j queries for retrieving entity IDs scoped to an admin's workspace.
 * These queries return ID sets that are then used to load full entities from Postgres.
 *
 * Query Naming Conventions:
 * - ADMIN_SCOPED_*: Start from Actor.id, traverse MEMBER_OF to Workspace, then to entities
 * - *_IN_WORKSPACE_SCOPE: Accept workspaceId directly (used when workspaceId is already known)
 * - BUSINESS_SCOPED_*: Filter by businessId (for Order/Delivery which have FK in Postgres)
 */

// ============================================================================
// ADMIN-SCOPED QUERIES (start from actorId)
// ============================================================================

/**
 * Get business IDs scoped to an admin actor's workspace memberships.
 * Traverses: Actor -[:MEMBER_OF]-> Workspace <-[:OPERATES_IN|MEMBER_OF]- Business
 *
 * @param $actorId - The admin actor's ID
 * @returns businessId for each business in the actor's workspace scope
 */
export const ADMIN_SCOPED_BUSINESS_IDS = `
  MATCH (a:Actor {id: $actorId})-[:MEMBER_OF]->(w:Workspace)
  MATCH (b:Business)-[:OPERATES_IN|MEMBER_OF]->(w)
  RETURN DISTINCT b.id as businessId
  ORDER BY b.businessName
`;

/**
 * Get sacco IDs scoped to an admin actor's workspace memberships.
 * Traverses: Actor -[:MEMBER_OF]-> Workspace <-[:OPERATES_IN|MEMBER_OF]- Sacco
 *
 * @param $actorId - The admin actor's ID
 * @returns saccoId for each sacco in the actor's workspace scope
 */
export const ADMIN_SCOPED_SACCO_IDS = `
  MATCH (a:Actor {id: $actorId})-[:MEMBER_OF]->(w:Workspace)
  MATCH (s:Sacco)-[:OPERATES_IN|MEMBER_OF]->(w)
  RETURN DISTINCT s.id as saccoId
  ORDER BY s.name
`;

/**
 * Get rider IDs scoped to an admin actor's workspace memberships.
 * Includes riders directly linked to workspace or via their Sacco's workspace membership.
 *
 * @param $actorId - The admin actor's ID
 * @param $saccoId - Optional sacco filter (null for all saccos)
 * @returns riderId for each rider in scope
 */
export const ADMIN_SCOPED_RIDER_IDS = `
  MATCH (a:Actor {id: $actorId})-[:MEMBER_OF]->(w:Workspace)
  OPTIONAL MATCH (r1:Rider)-[:MEMBER_OF]->(w)
  OPTIONAL MATCH (s:Sacco)-[:OPERATES_IN|MEMBER_OF]->(w)
  OPTIONAL MATCH (r2:Rider)-[:BELONGS_TO]->(s)
  WITH collect(DISTINCT r1) + collect(DISTINCT r2) as allRiders
  UNWIND allRiders as rider
  WITH rider WHERE rider IS NOT NULL
  WITH rider WHERE $saccoId IS NULL OR rider.saccoId = $saccoId
  RETURN DISTINCT rider.id as riderId
  ORDER BY rider.fullName
`;

// ============================================================================
// BUSINESS-SCOPED QUERIES (for Order/Delivery filtering)
// ============================================================================

/**
 * Note: Orders and Deliveries have businessId as a Postgres foreign key.
 * Instead of Neo4j queries, use Postgres WHERE clauses with the business IDs
 * returned from ADMIN_SCOPED_BUSINESS_IDS or BUSINESSES_IN_WORKSPACE_SCOPE.
 *
 * Example Postgres filter pattern:
 *   const businessIds = await neo4jQuery(ADMIN_SCOPED_BUSINESS_IDS, { actorId });
 *   const orders = await orderRepo.find({ where: { businessId: In(businessIds) } });
 *
 * If Neo4j projections for Order/Delivery are added in the future, add:
 *   BUSINESS_SCOPED_ORDER_IDS and BUSINESS_SCOPED_DELIVERY_IDS queries here.
 */

// ============================================================================
// WORKSPACE-SCOPED QUERIES (accept workspaceId directly)
// ============================================================================

/**
 * Find all business IDs within a workspace scope.
 * Assumes businesses are linked to workspaces via OPERATES_IN or membership relationships.
 */
export const BUSINESSES_IN_WORKSPACE_SCOPE = `
  MATCH (b:Business)
  WHERE b.id IS NOT NULL
  OPTIONAL MATCH (b)-[:OPERATES_IN|MEMBER_OF]->(w:Workspace {id: $workspaceId})
  WITH b, w
  WHERE $workspaceId IS NULL OR w IS NOT NULL
  RETURN DISTINCT b.id as businessId
  ORDER BY b.businessName
`;

/**
 * Find all sacco IDs within a workspace scope.
 */
export const SACCOS_IN_WORKSPACE_SCOPE = `
  MATCH (s:Sacco)
  WHERE s.id IS NOT NULL
  OPTIONAL MATCH (s)-[:OPERATES_IN|MEMBER_OF]->(w:Workspace {id: $workspaceId})
  WITH s, w
  WHERE $workspaceId IS NULL OR w IS NOT NULL
  RETURN DISTINCT s.id as saccoId
  ORDER BY s.name
`;

/**
 * Find rider IDs within workspace scope, optionally filtered by saccoId.
 */
export const RIDERS_IN_WORKSPACE_SCOPE = `
  MATCH (r:Rider)
  WHERE r.id IS NOT NULL
  OPTIONAL MATCH (r)-[:BELONGS_TO]->(s:Sacco)
  OPTIONAL MATCH (r)-[:MEMBER_OF]->(w:Workspace {id: $workspaceId})
  OPTIONAL MATCH (s)-[:OPERATES_IN|MEMBER_OF]->(ws:Workspace {id: $workspaceId})
  WITH r, s, w, ws
  WHERE $workspaceId IS NULL OR w IS NOT NULL OR ws IS NOT NULL
  WITH r, s
  WHERE $saccoId IS NULL OR s.id = $saccoId
  RETURN DISTINCT r.id as riderId
  ORDER BY r.fullName
`;

/**
 * Find business IDs that a specific rider has delivered for.
 */
export const BUSINESSES_FOR_RIDER = `
  MATCH (r:Rider {id: $riderId})-[:DELIVERED_FOR]->(b:Business)
  RETURN DISTINCT b.id as businessId
`;

/**
 * Find all business IDs in scope, used for order/delivery filtering.
 * Returns all businesses if workspaceId is null (super-admin scope).
 */
export const ALL_BUSINESS_IDS_IN_SCOPE = `
  MATCH (b:Business)
  OPTIONAL MATCH (b)-[:OPERATES_IN|MEMBER_OF]->(w:Workspace {id: $workspaceId})
  WITH b, w
  WHERE $workspaceId IS NULL OR w IS NOT NULL
  RETURN DISTINCT b.id as businessId
`;

/**
 * Find all rider IDs in scope, used for delivery filtering.
 */
export const ALL_RIDER_IDS_IN_SCOPE = `
  MATCH (r:Rider)
  OPTIONAL MATCH (r)-[:BELONGS_TO]->(s:Sacco)
  OPTIONAL MATCH (r)-[:MEMBER_OF]->(w:Workspace {id: $workspaceId})
  OPTIONAL MATCH (s)-[:OPERATES_IN|MEMBER_OF]->(ws:Workspace {id: $workspaceId})
  WITH r, w, ws
  WHERE $workspaceId IS NULL OR w IS NOT NULL OR ws IS NOT NULL
  RETURN DISTINCT r.id as riderId
`;
