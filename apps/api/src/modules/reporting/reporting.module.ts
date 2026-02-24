import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contact-graph/entities/contact.entity';
import { ContactRelationship } from '../contact-graph/entities/contact-relationship.entity';

import { ReportBuilderService } from './services/report-builder.service';
import { RoleBasedAccessService } from './services/role-based-access.service';
import { DashboardService } from './services/dashboard.service';

/**
 * ReportingModule
 *
 * Provides reporting and analytics capabilities:
 * - Report building and execution
 * - Role-based access control
 * - Dashboard management
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contact, ContactRelationship])],
  providers: [ReportBuilderService, RoleBasedAccessService, DashboardService],
  exports: [ReportBuilderService, RoleBasedAccessService, DashboardService, TypeOrmModule],
})
export class ReportingModule {}
