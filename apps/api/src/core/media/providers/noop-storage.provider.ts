import { Injectable, Logger } from '@nestjs/common';

import {
  MultipartUploadInit,
  MultipartUploadPart,
  SignedUrlOptions,
  StorageDownloadResult,
  StorageProvider,
  StorageUploadResult,
} from './storage-provider.interface';

/**
 * No-operation storage provider for testing and development.
 * Returns stub values for all operations without persisting data.
 */
@Injectable()
export class NoOpStorageProvider implements StorageProvider {
  private readonly logger = new Logger(NoOpStorageProvider.name);

  readonly providerId = 'noop';

  async upload(key: string, body: Buffer, contentType: string): Promise<StorageUploadResult> {
    this.logger.debug(`NoOp upload called for key: ${key}, contentType: ${contentType}`);
    return {
      storageKey: key,
      size: body.length,
      checksum: 'noop-checksum',
    };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    this.logger.debug(`NoOp download called for key: ${key}`);
    return {
      body: Buffer.from(''),
      contentType: 'application/octet-stream',
      size: 0,
    };
  }

  async delete(key: string): Promise<void> {
    this.logger.debug(`NoOp delete called for key: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    this.logger.debug(`NoOp exists called for key: ${key}`);
    return false;
  }

  async generateSignedUrl(
    key: string,
    operation: 'GET' | 'PUT',
    options: SignedUrlOptions
  ): Promise<string> {
    this.logger.debug(
      `NoOp generateSignedUrl called for key: ${key}, operation: ${operation}, expires: ${options.expiresInSeconds}s`
    );
    return `https://noop.local/${key}?signature=noop`;
  }

  async initiateMultipartUpload(key: string, contentType: string): Promise<MultipartUploadInit> {
    this.logger.debug(
      `NoOp initiateMultipartUpload called for key: ${key}, contentType: ${contentType}`
    );
    return {
      uploadId: 'noop-upload-id',
      storageKey: key,
    };
  }

  async uploadPart(
    uploadId: string,
    key: string,
    partNumber: number,
    body: Buffer
  ): Promise<MultipartUploadPart> {
    this.logger.debug(
      `NoOp uploadPart called for uploadId: ${uploadId}, key: ${key}, partNumber: ${partNumber}, size: ${body.length}`
    );
    return {
      partNumber,
      etag: 'noop-etag',
    };
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: MultipartUploadPart[]
  ): Promise<StorageUploadResult> {
    this.logger.debug(
      `NoOp completeMultipartUpload called for uploadId: ${uploadId}, key: ${key}, parts: ${parts.length}`
    );
    return {
      storageKey: key,
      size: 0,
      checksum: 'noop-checksum',
    };
  }

  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    this.logger.debug(`NoOp abortMultipartUpload called for uploadId: ${uploadId}, key: ${key}`);
  }
}
