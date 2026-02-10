/**
 * Hierarchy Queries for Admin Dashboard
 *
 * Neo4j queries for retrieving entity IDs scoped to an admin's workspace.
 * These queries return ID sets that are then used to load full entities from Postgres.
 */

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
