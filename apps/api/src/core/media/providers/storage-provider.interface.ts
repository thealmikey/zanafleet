import { Readable } from 'stream';

/**
 * Result of a successful upload operation.
 */
export interface StorageUploadResult {
  storageKey: string;
  size: number;
  checksum: string;
  url?: string;
}

/**
 * Result of a download operation containing the file body and metadata.
 */
export interface StorageDownloadResult {
  body: Buffer | Readable;
  contentType: string;
  size: number;
}

/**
 * Options for generating signed URLs.
 */
export interface SignedUrlOptions {
  expiresInSeconds: number;
  contentType?: string;
  contentDisposition?: string;
}

/**
 * Represents a single part in a multipart upload.
 */
export interface MultipartUploadPart {
  partNumber: number;
  etag: string;
}

/**
 * Result of initiating a multipart upload.
 */
export interface MultipartUploadInit {
  uploadId: string;
  storageKey: string;
}

/**
 * Provider identifier token for dependency injection.
 */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/**
 * Abstract interface for object storage services.
 * Implementations can wrap various providers (S3, MinIO, GCS, Azure Blob, etc.)
 */
export interface StorageProvider {
  /**
   * Unique identifier for this provider (e.g., 's3', 'minio', 'gcs', 'noop')
   */
  readonly providerId: string;

  /**
   * Upload a file to storage.
   * @param key - The storage key (path) for the file
   * @param body - The file content as a Buffer
   * @param contentType - The MIME type of the file
   * @returns Upload result with storage key, size, and checksum
   */
  upload(key: string, body: Buffer, contentType: string): Promise<StorageUploadResult>;

  /**
   * Download a file from storage.
   * @param key - The storage key (path) of the file
   * @returns Download result with body, content type, and size
   */
  download(key: string): Promise<StorageDownloadResult>;

  /**
   * Delete a file from storage.
   * @param key - The storage key (path) of the file to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists in storage.
   * @param key - The storage key (path) to check
   * @returns True if the file exists, false otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a signed URL for temporary access to a file.
   * @param key - The storage key (path) of the file
   * @param operation - The HTTP operation ('GET' for download, 'PUT' for upload)
   * @param options - Signed URL options including expiration
   * @returns The signed URL string
   */
  generateSignedUrl(
    key: string,
    operation: 'GET' | 'PUT',
    options: SignedUrlOptions
  ): Promise<string>;

  /**
   * Initiate a multipart upload for large files.
   * @param key - The storage key (path) for the file
   * @param contentType - The MIME type of the file
   * @returns Multipart upload initialization result with uploadId
   */
  initiateMultipartUpload(key: string, contentType: string): Promise<MultipartUploadInit>;

  /**
   * Upload a single part in a multipart upload.
   * @param uploadId - The multipart upload ID
   * @param key - The storage key (path) of the file
   * @param partNumber - The part number (1-indexed)
   * @param body - The part content as a Buffer
   * @returns The uploaded part metadata including etag
   */
  uploadPart(
    uploadId: string,
    key: string,
    partNumber: number,
    body: Buffer
  ): Promise<MultipartUploadPart>;

  /**
   * Complete a multipart upload by assembling all parts.
   * @param uploadId - The multipart upload ID
   * @param key - The storage key (path) of the file
   * @param parts - Array of uploaded parts with part numbers and etags
   * @returns Upload result with final storage key, size, and checksum
   */
  completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: MultipartUploadPart[]
  ): Promise<StorageUploadResult>;

  /**
   * Abort a multipart upload and clean up any uploaded parts.
   * @param uploadId - The multipart upload ID
   * @param key - The storage key (path) of the file
   */
  abortMultipartUpload(uploadId: string, key: string): Promise<void>;
}
