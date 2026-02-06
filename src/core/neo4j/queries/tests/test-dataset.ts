/**
 * Test Dataset for Neo4j Query Pack
 *
 * Provides sample data and Cypher statements for seeding test graphs.
 * Used by query-pack.spec.ts for unit testing.
 */

export interface TestActor {
  id: string;
  type: string;
  name: string;
  capabilities: string[];
}

export interface TestWorkspace {
  id: string;
  name: string;
  type: string;
  geo: string;
  status: string;
}

export interface TestCommitment {
  id: string;
  status: string;
  description: string;
}

export interface TestMembership {
  actorId: string;
  workspaceId: string;
  joinedAt: string;
}

export interface TestCommitted {
  actorId: string;
  commitmentId: string;
}

/**
 * Sample actors for testing
 */
export const TEST_ACTORS: TestActor[] = [
  {
    id: 'actor-001',
    type: 'RIDER',
    name: 'John Kamau',
    capabilities: ['MOTORCYCLE', 'COLD_CHAIN'],
  },
  {
    id: 'actor-002',
    type: 'RIDER',
    name: 'Mary Wanjiku',
    capabilities: ['BICYCLE', 'FRAGILE'],
  },
  {
    id: 'actor-003',
    type: 'RIDER',
    name: 'Peter Ochieng',
    capabilities: ['MOTORCYCLE'],
  },
  {
    id: 'actor-004',
    type: 'DRIVER',
    name: 'James Mwangi',
    capabilities: ['TRUCK', 'COLD_CHAIN', 'HEAVY'],
  },
  {
    id: 'actor-005',
    type: 'MERCHANT',
    name: 'Grace Akinyi',
    capabilities: ['RETAIL'],
  },
];

/**
 * Sample workspaces for testing
 */
export const TEST_WORKSPACES: TestWorkspace[] = [
  {
    id: 'ws-001',
    name: 'Nairobi Express SACCO',
    type: 'SACCO',
    geo: 'Nairobi, Kenya',
    status: 'ACTIVE',
  },
  {
    id: 'ws-002',
    name: 'Mombasa Logistics',
    type: 'BUSINESS',
    geo: 'Mombasa, Kenya',
    status: 'ACTIVE',
  },
  {
    id: 'ws-003',
    name: 'Kisumu Traders',
    type: 'BUSINESS',
    geo: 'Kisumu, Kenya',
    status: 'ACTIVE',
  },
  {
    id: 'ws-004',
    name: 'Nakuru Cooperative',
    type: 'COOPERATIVE',
    geo: 'Nakuru, Kenya',
    status: 'ACTIVE',
  },
];

/**
 * Sample commitments for testing
 */
export const TEST_COMMITMENTS: TestCommitment[] = [
  { id: 'commit-001', status: 'FULFILLED', description: 'Delivery to Westlands' },
  { id: 'commit-002', status: 'FULFILLED', description: 'Pickup from CBD' },
  { id: 'commit-003', status: 'BREACHED', description: 'Late delivery to Karen' },
  { id: 'commit-004', status: 'PENDING', description: 'Scheduled pickup' },
  { id: 'commit-005', status: 'FULFILLED', description: 'Express delivery' },
  { id: 'commit-006', status: 'FULFILLED', description: 'Same-day delivery' },
  { id: 'commit-007', status: 'BREACHED', description: 'Missed deadline' },
  { id: 'commit-008', status: 'PENDING', description: 'Tomorrow pickup' },
];

/**
 * Sample memberships (actor -> workspace relationships)
 */
export const TEST_MEMBERSHIPS: TestMembership[] = [
  { actorId: 'actor-001', workspaceId: 'ws-001', joinedAt: '2024-01-15T10:00:00Z' },
  { actorId: 'actor-002', workspaceId: 'ws-001', joinedAt: '2024-01-20T09:00:00Z' },
  { actorId: 'actor-003', workspaceId: 'ws-002', joinedAt: '2024-02-01T11:00:00Z' },
  { actorId: 'actor-004', workspaceId: 'ws-002', joinedAt: '2024-02-05T14:00:00Z' },
  { actorId: 'actor-005', workspaceId: 'ws-003', joinedAt: '2024-02-10T08:00:00Z' },
];

/**
 * Sample committed relationships (actor -> commitment)
 */
export const TEST_COMMITTED: TestCommitted[] = [
  { actorId: 'actor-001', commitmentId: 'commit-001' },
  { actorId: 'actor-001', commitmentId: 'commit-002' },
  { actorId: 'actor-001', commitmentId: 'commit-003' },
  { actorId: 'actor-002', commitmentId: 'commit-004' },
  { actorId: 'actor-002', commitmentId: 'commit-005' },
  { actorId: 'actor-003', commitmentId: 'commit-006' },
  { actorId: 'actor-003', commitmentId: 'commit-007' },
  { actorId: 'actor-004', commitmentId: 'commit-008' },
];

/**
 * Cypher statement to clear all test data
 */
export const CLEAR_TEST_DATA = `
  MATCH (n)
  WHERE n.id STARTS WITH 'actor-' OR n.id STARTS WITH 'ws-' OR n.id STARTS WITH 'commit-'
  DETACH DELETE n
`;

/**
 * Cypher statement to seed actors
 */
export const SEED_ACTORS = `
  UNWIND $actors as actor
  MERGE (a:Actor {id: actor.id})
  SET a.type = actor.type,
      a.name = actor.name,
      a.capabilities = actor.capabilities
`;

/**
 * Cypher statement to seed workspaces
 */
export const SEED_WORKSPACES = `
  UNWIND $workspaces as ws
  MERGE (w:Workspace {id: ws.id})
  SET w.name = ws.name,
      w.type = ws.type,
      w.geo = ws.geo,
      w.status = ws.status
`;

/**
 * Cypher statement to seed commitments
 */
export const SEED_COMMITMENTS = `
  UNWIND $commitments as commit
  MERGE (c:Commitment {id: commit.id})
  SET c.status = commit.status,
      c.description = commit.description
`;

/**
 * Cypher statement to seed memberships (MEMBER_OF relationships)
 */
export const SEED_MEMBERSHIPS = `
  UNWIND $memberships as m
  MATCH (a:Actor {id: m.actorId})
  MATCH (w:Workspace {id: m.workspaceId})
  MERGE (a)-[r:MEMBER_OF]->(w)
  SET r.joinedAt = m.joinedAt
`;

/**
 * Cypher statement to seed committed relationships
 */
export const SEED_COMMITTED = `
  UNWIND $committed as c
  MATCH (a:Actor {id: c.actorId})
  MATCH (commit:Commitment {id: c.commitmentId})
  MERGE (a)-[:COMMITTED]->(commit)
`;

/**
 * Seeds the complete test dataset.
 * Returns array of Cypher statements with their parameters.
 */
export function getTestDataSeedStatements(): Array<{
  query: string;
  params: Record<string, unknown>;
}> {
  return [
    { query: SEED_ACTORS, params: { actors: TEST_ACTORS } },
    { query: SEED_WORKSPACES, params: { workspaces: TEST_WORKSPACES } },
    { query: SEED_COMMITMENTS, params: { commitments: TEST_COMMITMENTS } },
    { query: SEED_MEMBERSHIPS, params: { memberships: TEST_MEMBERSHIPS } },
    { query: SEED_COMMITTED, params: { committed: TEST_COMMITTED } },
  ];
}

/**
 * Expected results for test queries (pre-computed from test data)
 */
export const EXPECTED_RESULTS = {
  ridersWithSuccessRate80: [
    { riderId: 'actor-001', name: 'John Kamau', successRate: 2 / 3, totalCommitments: 3 },
  ],
  ridersWithSuccessRate50: [
    { riderId: 'actor-001', name: 'John Kamau', successRate: 2 / 3, totalCommitments: 3 },
    { riderId: 'actor-002', name: 'Mary Wanjiku', successRate: 1 / 2, totalCommitments: 2 },
    { riderId: 'actor-003', name: 'Peter Ochieng', successRate: 1 / 2, totalCommitments: 2 },
  ],
  actorsWithBreaches: [
    { actorId: 'actor-001', actorType: 'RIDER', name: 'John Kamau', breachCount: 1 },
    { actorId: 'actor-003', actorType: 'RIDER', name: 'Peter Ochieng', breachCount: 1 },
  ],
  businessesNeedingColdChain: [{ workspaceId: 'ws-003', businessName: 'Kisumu Traders' }],
  workspacesByDensityNairobi: [
    { workspaceId: 'ws-001', name: 'Nairobi Express SACCO', type: 'SACCO', memberCount: 2 },
  ],
};
