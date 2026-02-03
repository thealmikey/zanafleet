/**
 * Workspace-related Cypher queries for Neo4j
 *
 * All queries are parameterized for safety and performance.
 * Compatible with Neo4j Aura (no APOC required).
 */

/**
 * Find workspaces by geographic area with member density.
 * Returns workspaces sorted by member count (highest first).
 *
 * @param geo - Geographic area substring to match (e.g., 'Nairobi', 'Mombasa')
 * @returns workspaceId, name, type, geo, memberCount
 */
export const WORKSPACES_BY_DENSITY = `
  MATCH (w:Workspace)
  WHERE w.geo CONTAINS $geo
  OPTIONAL MATCH (a:Actor)-[:MEMBER_OF]->(w)
  RETURN w.id as workspaceId, w.name as name, w.type as type, w.geo as geo,
         count(a) as memberCount
  ORDER BY memberCount DESC
`;

/**
 * Find workspaces by type.
 *
 * @param workspaceType - Type of workspace (e.g., 'BUSINESS', 'SACCO', 'COOPERATIVE')
 * @returns workspaceId, name, geo, memberCount
 */
export const WORKSPACES_BY_TYPE = `
  MATCH (w:Workspace {type: $workspaceType})
  OPTIONAL MATCH (a:Actor)-[:MEMBER_OF]->(w)
  RETURN w.id as workspaceId, w.name as name, w.geo as geo,
         count(a) as memberCount
  ORDER BY w.name
`;

/**
 * Get workspace details with member summary.
 *
 * @param workspaceId - UUID of the workspace
 * @returns workspace details with member breakdown by type
 */
export const WORKSPACE_DETAILS = `
  MATCH (w:Workspace {id: $workspaceId})
  OPTIONAL MATCH (a:Actor)-[:MEMBER_OF]->(w)
  WITH w, a.type as actorType, count(a) as typeCount
  WITH w, collect({type: actorType, count: typeCount}) as membersByType
  RETURN w.id as workspaceId, w.name as name, w.type as type, w.geo as geo,
         w.status as status, membersByType
`;

/**
 * Find workspaces with active commitments.
 *
 * @returns workspaceId, name, activeCommitmentCount
 */
export const WORKSPACES_WITH_ACTIVE_COMMITMENTS = `
  MATCH (w:Workspace)<-[:MEMBER_OF]-(a:Actor)-[:COMMITTED]->(c:Commitment)
  WHERE c.status = 'PENDING'
  WITH w, count(DISTINCT c) as activeCount
  RETURN w.id as workspaceId, w.name as name, w.type as type,
         activeCount as activeCommitmentCount
  ORDER BY activeCount DESC
`;
