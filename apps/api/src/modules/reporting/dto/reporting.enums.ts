/**
 * Reporting Module DTOs
 *
 * Defines report types, aggregations, and view configurations
 */

/**
 * Report types available in the system
 */
export enum ReportType {
  // Contact reports
  CONTACT_SUMMARY = 'CONTACT_SUMMARY',
  CONTACT_GROWTH = 'CONTACT_GROWTH',
  CONTACT_ACTIVITY = 'CONTACT_ACTIVITY',

  // Relationship reports
  RELATIONSHIP_NETWORK = 'RELATIONSHIP_NETWORK',
  REFERRAL_ANALYTICS = 'REFERRAL_ANALYTICS',

  // Business reports
  CONVERSION_FUNNEL = 'CONVERSION_FUNNEL',
  SEGMENT_ANALYTICS = 'SEGMENT_ANALYTICS',

  // Performance reports
  RIDER_PERFORMANCE = 'RIDER_PERFORMANCE',
  BUSINESS_METRICS = 'BUSINESS_METRICS',
  FLEET_UTILIZATION = 'FLEET_UTILIZATION',

  // Financial reports
  REVENUE_ANALYTICS = 'REVENUE_ANALYTICS',
  COMMISSION_SUMMARY = 'COMMISSION_SUMMARY',
}

/**
 * Time granularity for aggregations
 */
export enum TimeGranularity {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Aggregation functions
 */
export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  DISTINCT = 'DISTINCT',
  PERCENTILE = 'PERCENTILE',
}

/**
 * Filter operators for report queries
 */
export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  BETWEEN = 'BETWEEN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
}

/**
 * Report filter definition
 */
export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value?: unknown;
  values?: unknown[];
}

/**
 * Report aggregation definition
 */
export interface ReportAggregation {
  field: string;
  type: AggregationType;
  alias?: string;
}

/**
 * Report dimension for grouping
 */
export interface ReportDimension {
  field: string;
  order?: 'ASC' | 'DESC';
}

/**
 * Date range for report queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Pagination for report results
 */
export interface ReportPagination {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * Base report query parameters
 */
export interface ReportQuery {
  reportType: ReportType;
  dateRange: DateRange;
  filters?: ReportFilter[];
  aggregations?: ReportAggregation[];
  dimensions?: ReportDimension[];
  pagination?: ReportPagination;
  granularity?: TimeGranularity;
}

/**
 * Report row result
 */
export interface ReportRow {
  [key: string]: unknown;
}

/**
 * Report result with metadata
 */
export interface ReportResult {
  columns: string[];
  rows: ReportRow[];
  pagination?: ReportPagination;
  metadata?: {
    generatedAt: Date;
    executionTimeMs: number;
    totalRows: number;
  };
}

/**
 * Dashboard widget types
 */
export enum DashboardWidgetType {
  KPI_CARD = 'KPI_CARD',
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  TABLE = 'TABLE',
  FUNNEL = 'FUNNEL',
  MAP = 'MAP',
  HEATMAP = 'HEATMAP',
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  reportType: ReportType;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config?: Record<string, unknown>;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isDefault?: boolean;
}

/**
 * Role-based view permissions
 */
export enum ViewPermission {
  PUBLIC = 'PUBLIC',
  RIDER = 'RIDER',
  BUSINESS = 'BUSINESS',
  FLEET_MANAGER = 'FLEET_MANAGER',
  MARKETPLACE = 'MARKETPLACE',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

/**
 * Report access control
 */
export interface ReportAccess {
  reportType: ReportType;
  requiredPermissions: ViewPermission[];
  workspaceScoped: boolean;
  platformWide: boolean;
}
