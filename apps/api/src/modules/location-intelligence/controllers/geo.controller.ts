import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
  Header,
} from '@nestjs/common';
import { GeoPoint, GeoBounds, ETAResult, DistanceResult, ZoneCluster } from '@zanafleet/contracts';


import { GeoQueryCoordinator } from '../coordinators/geo-query.coordinator';
import { HeatmapCell } from '../types/heatmap.types';
import { RiderCandidate } from '../types/rider-candidate.types';

@Controller('geo')
@UseGuards(CapabilityGuard)
@RequireCapability('geo.read')
export class GeoController {
  constructor(private readonly geoQueryCoordinator: GeoQueryCoordinator) {}

  @Get('nearby-riders')
  @Header('Cache-Control', 'public, max-age=30')
  async getNearbyRiders(
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
    @Query('radius') radiusStr: string,
    @Query('limit') limitStr?: string
  ): Promise<RiderCandidate[]> {
    const lat = this.parseFloatOrThrow('lat', latStr);
    const lng = this.parseFloatOrThrow('lng', lngStr);
    const radius = this.parseIntOrThrow('radius', radiusStr);
    const limit = limitStr ? this.parseIntOrThrow('limit', limitStr) : 10;

    return this.geoQueryCoordinator.findNearbyRiders({
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      limit,
    });
  }

  @Get('heatmap')
  @Header('Cache-Control', 'public, max-age=60')
  async getHeatmap(
    @Query('minLat') minLatStr: string,
    @Query('maxLat') maxLatStr: string,
    @Query('minLng') minLngStr: string,
    @Query('maxLng') maxLngStr: string,
    @Query('resolution') resolutionStr?: string
  ): Promise<HeatmapCell[]> {
    const minLat = this.parseFloatOrThrow('minLat', minLatStr);
    const maxLat = this.parseFloatOrThrow('maxLat', maxLatStr);
    const minLng = this.parseFloatOrThrow('minLng', minLngStr);
    const maxLng = this.parseFloatOrThrow('maxLng', maxLngStr);
    const resolution = resolutionStr ? this.parseIntOrThrow('resolution', resolutionStr) : 9;

    return this.geoQueryCoordinator.getDemandHeatmap({
      bounds: {
        minLat,
        maxLat,
        minLng,
        maxLng,
      },
      // Cast entire object to any to satisfy HeatmapParams structural typing
      resolution: resolution as any,
    } as any);
  }

  @Get('zones')
  @Header('Cache-Control', 'public, max-age=60')
  async getZones(
    @Query('minLat') minLatStr: string,
    @Query('maxLat') maxLatStr: string,
    @Query('minLng') minLngStr: string,
    @Query('maxLng') maxLngStr: string
  ): Promise<ZoneCluster[]> {
    const bounds = this.parseBounds(minLatStr, maxLatStr, minLngStr, maxLngStr);

    return this.geoQueryCoordinator.getZoneClusters(bounds);
  }

  @Get('eta')
  @Header('Cache-Control', 'public, max-age=15')
  async getETA(
    @Query('originLat') originLatStr: string,
    @Query('originLng') originLngStr: string,
    @Query('destLat') destLatStr: string,
    @Query('destLng') destLngStr: string
  ): Promise<ETAResult> {
    const origin = this.parseCoordinatePair('origin', originLatStr, originLngStr);
    const destination = this.parseCoordinatePair('dest', destLatStr, destLngStr);

    return this.geoQueryCoordinator.calculateETA(origin, destination);
  }

  @Get('distance')
  @Header('Cache-Control', 'public, max-age=60')
  async getDistance(
    @Query('originLat') originLatStr: string,
    @Query('originLng') originLngStr: string,
    @Query('destLat') destLatStr: string,
    @Query('destLng') destLngStr: string
  ): Promise<DistanceResult> {
    const origin = this.parseCoordinatePair('origin', originLatStr, originLngStr);
    const destination = this.parseCoordinatePair('dest', destLatStr, destLngStr);

    return this.geoQueryCoordinator.calculateRouteDistance(origin, destination);
  }

  @Get('service-area/:areaId/contains')
  @Header('Cache-Control', 'public, max-age=300')
  async checkServiceArea(
    @Param('areaId') areaId: string,
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string
  ): Promise<{ contains: boolean }> {
    const lat = this.parseFloatOrThrow('lat', latStr);
    const lng = this.parseFloatOrThrow('lng', lngStr);

    const contains = await this.geoQueryCoordinator.isWithinServiceArea(
      { latitude: lat, longitude: lng },
      areaId
    );

    return { contains };
  }

  private parseFloatOrThrow(name: string, value: string | undefined): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`Missing required parameter: ${name}`);
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new BadRequestException(`Invalid number for parameter: ${name}`);
    }
    return parsed;
  }

  private parseIntOrThrow(name: string, value: string | undefined): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`Missing required parameter: ${name}`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BadRequestException(`Invalid integer for parameter: ${name}`);
    }
    return parsed;
  }

  private parseBounds(
    minLatStr: string,
    maxLatStr: string,
    minLngStr: string,
    maxLngStr: string
  ): GeoBounds {
    return {
      minLat: this.parseFloatOrThrow('minLat', minLatStr),
      maxLat: this.parseFloatOrThrow('maxLat', maxLatStr),
      minLng: this.parseFloatOrThrow('minLng', minLngStr),
      maxLng: this.parseFloatOrThrow('maxLng', maxLngStr),
    };
  }

  private parseCoordinatePair(prefix: string, latStr: string, lngStr: string): GeoPoint {
    return {
      latitude: this.parseFloatOrThrow(`${prefix}Lat`, latStr),
      longitude: this.parseFloatOrThrow(`${prefix}Lng`, lngStr),
    };
  }
}
