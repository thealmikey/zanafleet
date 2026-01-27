/**
 * Rider-related Cypher queries for Neo4j
 *
 * All queries are parameterized for safety and performance.
 * Compatible with Neo4j Aura (no APOC required).
 */

/**
 * Find riders with a success rate at or above the specified minimum.
 * Success rate = fulfilled commitments / total commitments
 *
 * @param minRate - Minimum success rate (0.0 to 1.0)
 * @returns riderId, name, successRate, totalCommitments
 */
export const RIDERS_WITH_SUCCESS_RATE = `
  MATCH (a:Actor {type: 'RIDER'})-[:COMMITTED]->(c:Commitment)
  WITH a,
       count(c) as total,
       count(CASE WHEN c.status = 'FULFILLED' THEN 1 END) as fulfilled
  WHERE total > 0 AND (toFloat(fulfilled) / total) >= $minRate
  RETURN a.id as riderId, a.name as name,
         toFloat(fulfilled) / total as successRate, total as totalCommitments
  ORDER BY successRate DESC
`;

/**
 * Find all riders in a specific workspace
 *
 * @param workspaceId - UUID of the workspace
 * @returns riderId, name, joinedAt
 */
export const RIDERS_IN_WORKSPACE = `
  MATCH (a:Actor {type: 'RIDER'})-[m:MEMBER_OF]->(w:Workspace {id: $workspaceId})
  RETURN a.id as riderId, a.name as name, m.joinedAt as joinedAt
  ORDER BY a.name
`;

/**
 * Get rider commitment summary
 *
 * @param riderId - UUID of the rider
 * @returns total, fulfilled, breached, pending counts
 */
export const RIDER_COMMITMENT_SUMMARY = `
  MATCH (a:Actor {id: $riderId, type: 'RIDER'})
  OPTIONAL MATCH (a)-[:COMMITTED]->(c:Commitment)
  WITH a,
       count(c) as total,
       count(CASE WHEN c.status = 'FULFILLED' THEN 1 END) as fulfilled,
       count(CASE WHEN c.status = 'BREACHED' THEN 1 END) as breached,
       count(CASE WHEN c.status = 'PENDING' THEN 1 END) as pending
  RETURN a.id as riderId, a.name as name,
         total, fulfilled, breached, pending
`;
