/**
 * Business-related Cypher queries for Neo4j
 *
 * All queries are parameterized for safety and performance.
 * Compatible with Neo4j Aura (no APOC required).
 */

/**
 * Find businesses that do not have any actors with the specified capability.
 * Useful for identifying service gaps.
 *
 * @param capability - The capability to check for (e.g., 'COLD_CHAIN', 'FRAGILE')
 * @returns workspaceId, businessName
 */
export const BUSINESSES_NEEDING_CAPABILITY = `
  MATCH (w:Workspace {type: 'BUSINESS'})
  WHERE NOT EXISTS {
    MATCH (a:Actor)-[:MEMBER_OF]->(w)
    WHERE $capability IN a.capabilities
  }
  RETURN w.id as workspaceId, w.name as businessName
  ORDER BY w.name
`;

/**
 * Find businesses with their member count and capabilities coverage.
 *
 * @returns workspaceId, businessName, memberCount, capabilities
 */
export const BUSINESSES_WITH_CAPABILITIES = `
  MATCH (w:Workspace {type: 'BUSINESS'})
  OPTIONAL MATCH (a:Actor)-[:MEMBER_OF]->(w)
  WITH w, collect(DISTINCT a) as members
  UNWIND CASE WHEN size(members) = 0 THEN [null] ELSE members END as member
  WITH w, members,
       CASE WHEN member IS NOT NULL THEN member.capabilities ELSE [] END as caps
  UNWIND CASE WHEN size(caps) = 0 THEN [null] ELSE caps END as cap
  WITH w, size(members) as memberCount, collect(DISTINCT cap) as allCaps
  RETURN w.id as workspaceId, w.name as businessName,
         memberCount,
         [c IN allCaps WHERE c IS NOT NULL] as capabilities
  ORDER BY memberCount DESC
`;

/**
 * Find businesses in a specific geographic area.
 *
 * @param geo - Geographic area substring to match
 * @returns workspaceId, businessName, geo
 */
export const BUSINESSES_BY_GEO = `
  MATCH (w:Workspace {type: 'BUSINESS'})
  WHERE w.geo CONTAINS $geo
  RETURN w.id as workspaceId, w.name as businessName, w.geo as geo
  ORDER BY w.name
`;
