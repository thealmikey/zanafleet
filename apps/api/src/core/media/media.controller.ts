import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateMediaAssetInput, MediaAssetResponse, SignedUrlResponse } from '@zanafleet/contracts';

import { MediaService } from './services/media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('assets')
  async createAsset(@Body() input: CreateMediaAssetInput): Promise<MediaAssetResponse> {
    return this.mediaService.createMediaAsset(input, Buffer.alloc(0));
  }

  @Get('assets/:id/signed-url')
  async getSignedUrl(
    @Param('id') id: string,
    @Query('op') op?: 'GET' | 'PUT',
    @Query('expiresInSeconds') expiresInSecondsRaw?: string,
    @Query('contentType') _contentType?: string
  ): Promise<SignedUrlResponse> {
    const expiresInSeconds = expiresInSecondsRaw ? parseInt(expiresInSecondsRaw, 10) : 3600;
    if (op === 'PUT') {
      return this.mediaService.generateSignedUploadUrl(id, expiresInSeconds);
    }
    return this.mediaService.generateSignedDownloadUrl(id, expiresInSeconds);
  }
}
