import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';

import { Contact } from '../../contact-graph/entities/contact.entity';
import { ContactRelationship } from '../../contact-graph/entities/contact-relationship.entity';
import { ContactType, ContactStatus } from '../../contact-graph/dto/contact-graph.enums';
import {
  ReportType,
  ReportQuery,
  ReportResult,
  ReportRow,
  ReportFilter,
  AggregationType,
  TimeGranularity,
} from '../dto/reporting.enums';

/**
 * ReportBuilderService
 *
 * Executes report queries against contact and relationship data:
 * - Builds dynamic queries based on report type
 * - Applies filters, aggregations, and dimensions
 * - Returns formatted results with metadata
 */
@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactRelationship)
    private readonly relationshipRepository: Repository<ContactRelationship>
  ) {}

  /**
   * Execute a report query
   */
  async executeReport(query: ReportQuery, workspaceId: string | null): Promise<ReportResult> {
    const startTime = Date.now();

    let result: ReportResult;

    switch (query.reportType) {
      case ReportType.CONTACT_SUMMARY:
        result = await this.buildContactSummaryReport(query, workspaceId);
        break;
      case ReportType.CONTACT_GROWTH:
        result = await this.buildContactGrowthReport(query, workspaceId);
        break;
      case ReportType.CONTACT_ACTIVITY:
        result = await this.buildContactActivityReport(query, workspaceId);
        break;
      case ReportType.RELATIONSHIP_NETWORK:
        result = await this.buildRelationshipNetworkReport(query, workspaceId);
        break;
      case ReportType.SEGMENT_ANALYTICS:
        result = await this.buildSegmentAnalyticsReport(query, workspaceId);
        break;
      case ReportType.CONVERSION_FUNNEL:
        result = await this.buildConversionFunnelReport(query, workspaceId);
        break;
      default:
        throw new Error(`Unknown report type: ${query.reportType}`);
    }

    // Add metadata
    result.metadata = {
      generatedAt: new Date(),
      executionTimeMs: Date.now() - startTime,
      totalRows: result.rows.length,
    };

    return result;
  }

  /**
   * Build Contact Summary Report
   */
  private async buildContactSummaryReport(
    query: ReportQuery,
    workspaceId: string | null
  ): Promise<ReportResult> {
    const { dateRange, aggregations } = query;

    const baseQuery = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.createdAt >= :startDate', {
        startDate: dateRange.startDate,
      })
      .andWhere('contact.createdAt <= :endDate', {
        endDate: dateRange.endDate,
      });

    // Apply filters
    this.applyFilters(baseQuery, query.filters);

    // Get total count
    const totalCount = await baseQuery.getCount();

    // Get counts by status
    const statusCounts = await baseQuery
      .clone()
      .select('contact.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('contact.status')
      .getRawMany();

    // Get counts by type
    const typeCounts = await baseQuery
      .clone()
      .select('contact.contactType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('contact.contactType')
      .getRawMany();

    const rows: ReportRow[] = [
      {
        metric: 'Total Contacts',
        value: totalCount,
      },
      ...statusCounts.map((s: any) => ({
        metric: `Status: ${s.status}`,
        value: parseInt(s.count, 10),
      })),
      ...typeCounts.map((t: any) => ({
        metric: `Type: ${t.type}`,
        value: parseInt(t.count, 10),
      })),
    ];

    return {
      columns: ['metric', 'value'],
      rows,
    };
  }

  /**
   * Build Contact Growth Report (over time)
   */
  private async buildContactGrowthReport(
    query: ReportQuery,
    workspaceId: string | null
  ): Promise<ReportResult> {
    const { dateRange, granularity = TimeGranularity.DAILY } = query;

    // Determine date format based on granularity
    const dateFormat = this.getDateFormat(granularity);

    const rawData = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.createdAt >= :startDate', {
        startDate: dateRange.startDate,
      })
      .andWhere('contact.createdAt <= :endDate', {
        endDate: dateRange.endDate,
      })
      .select(`TO_CHAR(contact.createdAt, :format)`, 'period')
      .addSelect('COUNT(*)', 'count')
      .setParameter('format', dateFormat)
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    // Calculate cumulative totals
    let cumulative = 0;
    const rows: ReportRow[] = rawData.map((row: any) => {
      cumulative += parseInt(row.count, 10);
      return {
        period: row.period,
        newContacts: parseInt(row.count, 10),
        totalContacts: cumulative,
      };
    });

    return {
      columns: ['period', 'newContacts', 'totalContacts'],
      rows,
    };
  }

  /**
   * Build Contact Activity Report
   */
  private async buildContactActivityReport(
    query: ReportQuery,
    workspaceId: string | null
  ): Promise<ReportResult> {
    const { dateRange } = query;

    const activeContacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.lastInteractionAt >= :startDate', {
        startDate: dateRange.startDate,
      })
      .andWhere('contact.lastInteractionAt <= :endDate', {
        endDate: dateRange.endDate,
      })
      .orderBy('contact.lastInteractionAt', 'DESC')
      .limit(100)
      .getMany();

    const rows: ReportRow[] = activeContacts.map((contact) => ({
      id: contact.id,
      name: contact.displayName,
      type: contact.contactType,
      status: contact.status,
      lastInteraction: contact.lastInteractionAt,
      relationshipStrength: contact.relationshipStrength,
    }));

    return {
      columns: ['id', 'name', 'type', 'status', 'lastInteraction', 'relationshipStrength'],
      rows,
    };
  }

  /**
   * Build Relationship Network Report
   */
  private async buildRelationshipNetworkReport(
    query: ReportQuery,
    workspaceId: string | null
  ): Promise<ReportResult> {
    // Get all relationships
    const relationships = await this.relationshipRepository
      .createQueryBuilder('rel')
      .innerJoin('contact', 'fromContact', 'rel.fromContactId = fromContact.id')
      .innerJoin('contact', 'toContact', 'rel.toContactId = toContact.id')
      .where('fromContact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .select([
        'rel.fromContactId',
        'fromContact.displayName as fromName',
        'rel.toContactId',
        'toContact.displayName as toName',
        'rel.relationshipType',
        'rel.strength',
      ])
      .getRawMany();

    // Group by relationship type
    const typeGroups = new Map<string, number>();
    for (const rel of relationships) {
      const current = typeGroups.get(rel.relationship_type) || 0;
      typeGroups.set(rel.relationship_type, current + 1);
    }

    const rows: ReportRow[] = Array.from(typeGroups.entries()).map(([type, count]) => ({
      relationshipType: type,
      count,
    }));

    return {
      columns: ['relationshipType', 'count'],
      rows,
    };
  }

  /**
   * Build Segment Analytics Report
   */
  private async buildSegmentAnalyticsReport(
    query: ReportQuery,
    workspaceId: string | null
  ): Promise<ReportResult> {
    const { dateRange } = query;

    const segments = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
      .andWhere('contact.createdAt >= :startDate', {
        startDate: dateRange.startDate,
      })
      .andWhere('contact.createdAt <= :endDate', {
        endDate: dateRange.endDate,
      })
      .select('contact.contactType', 'segment')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN contact.status = :activeStatus THEN 1 ELSE 0 END)', 'active')
      .addSelect('AVG(contact.relationshipStrength)', 'avgStrength')
      .setParameter('activeStatus', ContactStatus.ACTIVE)
      .groupBy('contact.contactType')
      .getRawMany();

    const rows: ReportRow[] = segments.map((seg: any) => ({
      segment: seg.segment,
      totalContacts: parseInt(seg.total, 10),
      activeContacts: parseInt(seg.active, 10),
      conversionRate:
        seg.total > 0 ? (parseInt(seg.active, 10) / parseInt(seg.total, 10)) * 100 : 0,
      avgRelationshipStrength: parseFloat(seg.avg_strength) || 0,
    }));

    return {
      columns: [
        'segment',
        'totalContacts',
        'activeContacts',
        'conversionRate',
        'avgRelationshipStrength',
      ],
      rows,
    };
  }

  /**
   * Build Conversion Funnel Report
   */
  private async buildConversionFunnelReport(
    query: ReportQuery,
    workspaceId: string | null
  ): Promise<ReportResult> {
    const { dateRange } = query;

    // Count contacts at each stage
    const stages = [
      { name: 'Imported', status: null },
      { name: 'Pending', status: ContactStatus.PENDING },
      { name: 'Invited', status: ContactStatus.INVITED },
      { name: 'Verified', status: ContactStatus.VERIFIED },
      { name: 'Active', status: ContactStatus.ACTIVE },
    ];

    const rows: ReportRow[] = [];

    for (const stage of stages) {
      let queryBuilder = this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.workspaceId IS NOT DISTINCT FROM :workspaceId', { workspaceId })
        .andWhere('contact.createdAt >= :startDate', {
          startDate: dateRange.startDate,
        })
        .andWhere('contact.createdAt <= :endDate', {
          endDate: dateRange.endDate,
        });

      if (stage.status) {
        queryBuilder = queryBuilder.andWhere('contact.status = :status', {
          status: stage.status,
        });
      }

      const count = await queryBuilder.getCount();
      rows.push({
        stage: stage.name,
        count,
      });
    }

    // Calculate conversion rates between stages
    for (let i = 1; i < rows.length; i++) {
      const prevCount = rows[i - 1].count as number;
      const currCount = rows[i].count as number;
      rows[i].conversionRate = prevCount > 0 ? ((currCount / prevCount) * 100).toFixed(1) : '0';
    }
    rows[0].conversionRate = '100';

    return {
      columns: ['stage', 'count', 'conversionRate'],
      rows,
    };
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(queryBuilder: any, filters?: ReportFilter[]): void {
    if (!filters) return;

    for (const filter of filters) {
      const field = `contact.${filter.field}`;

      switch (filter.operator) {
        case 'EQUALS':
          queryBuilder.andWhere(`${field} = :${filter.field}`, {
            [filter.field]: filter.value,
          });
          break;
        case 'NOT_EQUALS':
          queryBuilder.andWhere(`${field} != :${filter.field}`, {
            [filter.field]: filter.value,
          });
          break;
        case 'IN':
          queryBuilder.andWhere(`${field} IN (:...${filter.field}s)`, {
            [`${filter.field}s`]: filter.values,
          });
          break;
        case 'GREATER_THAN':
          queryBuilder.andWhere(`${field} > :${filter.field}`, {
            [filter.field]: filter.value,
          });
          break;
        case 'LESS_THAN':
          queryBuilder.andWhere(`${field} < :${filter.field}`, {
            [filter.field]: filter.value,
          });
          break;
        // Add more operators as needed
      }
    }
  }

  /**
   * Get date format string based on granularity
   */
  private getDateFormat(granularity: TimeGranularity): string {
    switch (granularity) {
      case TimeGranularity.HOURLY:
        return 'YYYY-MM-DD HH24';
      case TimeGranularity.DAILY:
        return 'YYYY-MM-DD';
      case TimeGranularity.WEEKLY:
        return 'IYYY-IW';
      case TimeGranularity.MONTHLY:
        return 'YYYY-MM';
      case TimeGranularity.QUARTERLY:
        return 'YYYY-Q';
      case TimeGranularity.YEARLY:
        return 'YYYY';
      default:
        return 'YYYY-MM-DD';
    }
  }
}
