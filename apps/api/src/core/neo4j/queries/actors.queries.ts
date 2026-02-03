/**
 * Actor-related Cypher queries for Neo4j
 *
 * All queries are parameterized for safety and performance.
 * Compatible with Neo4j Aura (no APOC required).
 */

/**
 * Find actors who have breached commitments.
 * Returns actors with count of breached commitments, sorted by breach count.
 *
 * @returns actorId, actorType, name, breachCount
 */
export const ACTORS_WITH_BREACHES = `
  MATCH (a:Actor)-[:COMMITTED]->(c:Commitment)
  WHERE c.status = 'BREACHED'
  RETURN DISTINCT a.id as actorId, a.type as actorType, a.name as name,
         count(c) as breachCount
  ORDER BY breachCount DESC
`;

/**
 * Find actors by type within a specific workspace.
 *
 * @param workspaceId - UUID of the workspace
 * @param actorType - Type of actor (e.g., 'RIDER', 'DRIVER', 'MERCHANT')
 * @returns actorId, name, capabilities
 */
export const ACTORS_BY_TYPE_IN_WORKSPACE = `
  MATCH (a:Actor {type: $actorType})-[:MEMBER_OF]->(w:Workspace {id: $workspaceId})
  RETURN a.id as actorId, a.name as name, a.capabilities as capabilities
  ORDER BY a.name
`;

/**
 * Find actors with specific capability.
 *
 * @param capability - The capability to search for
 * @returns actorId, actorType, name, workspaceIds
 */
export const ACTORS_WITH_CAPABILITY = `
  MATCH (a:Actor)
  WHERE $capability IN a.capabilities
  OPTIONAL MATCH (a)-[:MEMBER_OF]->(w:Workspace)
  RETURN a.id as actorId, a.type as actorType, a.name as name,
         collect(w.id) as workspaceIds
  ORDER BY a.name
`;

/**
 * Get actor details with all relationships.
 *
 * @param actorId - UUID of the actor
 * @returns actor details with workspace memberships and commitment counts
 */
export const ACTOR_DETAILS = `
  MATCH (a:Actor {id: $actorId})
  OPTIONAL MATCH (a)-[:MEMBER_OF]->(w:Workspace)
  OPTIONAL MATCH (a)-[:COMMITTED]->(c:Commitment)
  WITH a, collect(DISTINCT w.id) as workspaces,
       count(c) as totalCommitments,
       count(CASE WHEN c.status = 'FULFILLED' THEN 1 END) as fulfilled,
       count(CASE WHEN c.status = 'BREACHED' THEN 1 END) as breached
  RETURN a.id as actorId, a.type as actorType, a.name as name,
         a.capabilities as capabilities, workspaces,
         totalCommitments, fulfilled, breached
`;
