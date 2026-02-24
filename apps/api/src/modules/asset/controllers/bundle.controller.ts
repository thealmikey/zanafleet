import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import {
  CreateBundleDto,
  BundleResponseDto,
  AddTripToBundleDto,
  UpdateBundleStatusDto,
  BundleInvoiceDto,
} from '../dto/asset-platform.dto';
import { BundleService } from '../services/bundle.service';

/**
 * Bundle Controller
 * Manages multi-asset project bundles
 */
@Controller('bundles')
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  /**
   * Create a new bundle
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBundle(@Body() dto: CreateBundleDto): Promise<BundleResponseDto> {
    return this.bundleService.createBundle(dto);
  }

  /**
   * Get bundle by ID
   */
  @Get(':id')
  async getBundle(@Param('id') id: string): Promise<BundleResponseDto> {
    const bundle = await this.bundleService.getBundleById(id);

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    return bundle;
  }

  /**
   * Add a trip to bundle
   */
  @Patch(':id/trips')
  async addTripToBundle(
    @Param('id') bundleId: string,
    @Body() dto: AddTripToBundleDto
  ): Promise<{ bundleId: string; tripId: string }> {
    return this.bundleService.addTripToBundle(bundleId, dto);
  }

  /**
   * Update bundle status
   */
  @Patch(':id/status')
  async updateBundleStatus(
    @Param('id') bundleId: string,
    @Body() dto: UpdateBundleStatusDto
  ): Promise<BundleResponseDto> {
    return this.bundleService.updateBundleStatus(bundleId, dto);
  }

  /**
   * Generate invoice for bundle
   */
  @Get(':id/invoice')
  async generateInvoice(@Param('id') bundleId: string): Promise<BundleInvoiceDto> {
    return this.bundleService.generateInvoice(bundleId);
  }
}
