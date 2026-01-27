/**
 * Evidence Type Enum
 * Defines the types of evidence records in ZanaFleet
 */
export enum EvidenceType {
  CUSTOMER_FEEDBACK = 'customer_feedback',
  SACCO_VISIT = 'sacco_visit',
  OPS_ISSUE = 'ops_issue',
}

/**
 * Subject Type Enum
 * Defines the entity types that evidence can relate to
 */
export enum SubjectType {
  RIDER = 'rider',
  BUSINESS = 'business',
  SACCO = 'sacco',
}

/**
 * Evidence Source Enum
 * Defines the origin of evidence records
 */
export enum EvidenceSource {
  API = 'api',
  SMS = 'sms',
  OPS_APP = 'ops_app',
}
