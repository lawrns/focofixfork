/**
 * File Uploads and Attachments Entity Models
 * Defines the structure and operations for file management
 */

export type FileType =
  | 'document'     // PDF, DOC, DOCX, TXT
  | 'spreadsheet'  // XLS, XLSX, CSV
  | 'presentation' // PPT, PPTX
  | 'image'        // JPG, PNG, GIF, SVG, WEBP
  | 'video'        // MP4, AVI, MOV, WMV
  | 'audio'        // MP3, WAV, AAC, OGG
  | 'archive'      // ZIP, RAR, 7Z, TAR
  | 'code'         // JS, TS, PY, HTML, CSS, JSON, XML
  | 'other'        // Any other file type

export type UploadStatus = 'uploading' | 'completed' | 'failed' | 'cancelled'

export type AccessLevel = 'private' | 'workspace' | 'project' | 'public'

export interface FileAttachment {
  id: string
  filename: string
  original_filename: string
  mime_type: string
  file_type: FileType
  size_bytes: number
  storage_path: string
  public_url?: string
  thumbnail_url?: string
  entity_type: 'project' | 'milestone' | 'task' | 'comment' | 'time_entry' | 'workspace'
  entity_id: string
  uploaded_by: string
  uploaded_by_name: string
  access_level: AccessLevel
  status: UploadStatus
  upload_progress?: number
  error_message?: string
  metadata: FileMetadata
  tags: string[]
  version: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface FileMetadata {
  width?: number // For images
  height?: number // For images
  duration?: number // For videos/audio in seconds
  bitrate?: number // For videos/audio
  codec?: string // For videos/audio
  encoding?: string // Text encoding
  language?: string // Document language
  page_count?: number // For PDFs/documents
  checksum?: string // MD5 or SHA256 hash
  compression?: string // Compression method
  exif_data?: Record<string, any> // EXIF data for images
}

export interface UploadQueueItem {
  id: string
  file: File
  entity_type: FileAttachment['entity_type']
  entity_id: string
  access_level: AccessLevel
  tags: string[]
  status: UploadStatus
  progress: number
  error?: string
  attachment?: FileAttachment
  abortController?: AbortController
}

export interface FilePreview {
  url: string
  type: 'image' | 'video' | 'audio' | 'document' | 'text' | 'code'
  content?: string // For text/code files
  metadata: FileMetadata
  canPreview: boolean
  previewError?: string
}

export interface FilePermissions {
  can_upload: boolean
  can_download: boolean
  can_delete: boolean
  can_share: boolean
  max_file_size: number // In bytes
  allowed_types: FileType[]
  storage_quota: number // In bytes
  storage_used: number // In bytes
}

export interface FileStorageQuota {
  user_id?: string
  workspace_id?: string
  total_quota: number // In bytes
  used_quota: number // In bytes
  file_count: number
  last_updated: string
}

export interface FileSearchFilters {
  query?: string
  file_types?: FileType[]
  uploaded_by?: string[]
  date_from?: string
  date_to?: string
  size_min?: number
  size_max?: number
  tags?: string[]
  entity_type?: string
  entity_id?: string
  limit?: number
  offset?: number
}

export interface FileUploadOptions {
  maxSize?: number
  allowedTypes?: FileType[]
  generateThumbnail?: boolean
  accessLevel?: AccessLevel
  tags?: string[]
  onProgress?: (progress: number) => void
  onComplete?: (attachment: FileAttachment) => void
  onError?: (error: string) => void
}

export class FileAttachmentModel {
  // Maximum file sizes (in bytes)
  static readonly MAX_FILE_SIZES = {
    image: 10 * 1024 * 1024,      // 10MB
    video: 100 * 1024 * 1024,     // 100MB
    audio: 50 * 1024 * 1024,      // 50MB
    document: 25 * 1024 * 1024,   // 25MB
    spreadsheet: 25 * 1024 * 1024, // 25MB
    presentation: 50 * 1024 * 1024, // 50MB
    archive: 100 * 1024 * 1024,   // 100MB
    code: 5 * 1024 * 1024,        // 5MB
    other: 25 * 1024 * 1024       // 25MB
  } as const

  // Allowed MIME types for each file type
  static readonly MIME_TYPES = {
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ],
    spreadsheet: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.oasis.opendocument.spreadsheet'
    ],
    presentation: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ],
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ],
    video: [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-ms-wmv',
      'video/webm',
      'video/ogg'
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/x-ms-wma'
    ],
    archive: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip'
    ],
    code: [
      'application/javascript',
      'application/typescript',
      'text/javascript',
      'text/typescript',
      'text/x-python',
      'text/html',
      'text/css',
      'application/json',
      'text/xml',
      'application/xml'
    ]
  } as const

  /**
   * Determine file type from MIME type
   */
  static getFileTypeFromMime(mimeType: string): FileType {
    for (const [fileType, mimeTypes] of Object.entries(this.MIME_TYPES) as [string, readonly string[]][]) {
      if (mimeTypes.includes(mimeType)) {
        return fileType as FileType
      }
    }
    return 'other'
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * Check if file type is allowed
   */
  static isFileTypeAllowed(fileType: FileType, allowedTypes: FileType[]): boolean {
    return allowedTypes.includes(fileType)
  }

  /**
   * Check if file size is within limits
   */
  static isFileSizeAllowed(size: number, fileType: FileType, maxSize?: number): boolean {
    const defaultMaxSize = this.MAX_FILE_SIZES[fileType] || this.MAX_FILE_SIZES.other
    const effectiveMaxSize = maxSize || defaultMaxSize
    return size <= effectiveMaxSize
  }

  /**
   * Generate storage path for file
   */
  static generateStoragePath(
    entityType: string,
    entityId: string,
    filename: string,
    userId: string
  ): string {
    const timestamp = Date.now()
    const extension = this.getFileExtension(filename)
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

    return `${entityType}/${entityId}/${userId}/${timestamp}_${sanitizedFilename}`
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    options: FileUploadOptions = {}
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const fileType = this.getFileTypeFromMime(file.type)

    // Check file type
    if (options.allowedTypes && !this.isFileTypeAllowed(fileType, options.allowedTypes)) {
      errors.push(`File type "${fileType}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`)
    }

    // Check file size
    if (!this.isFileSizeAllowed(file.size, fileType, options.maxSize)) {
      const maxSizeMB = Math.round((options.maxSize || this.MAX_FILE_SIZES[fileType] || this.MAX_FILE_SIZES.other) / (1024 * 1024))
      errors.push(`File size exceeds maximum allowed size of ${maxSizeMB}MB`)
    }

    // Check filename length
    if (file.name.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  /**
   * Get file icon based on type
   */
  static getFileIcon(fileType: FileType): string {
    switch (fileType) {
      case 'document': return 'FileText'
      case 'spreadsheet': return 'FileSpreadsheet'
      case 'presentation': return 'Presentation'
      case 'image': return 'Image'
      case 'video': return 'Video'
      case 'audio': return 'Music'
      case 'archive': return 'Archive'
      case 'code': return 'Code'
      default: return 'File'
    }
  }

  /**
   * Check if file can be previewed
   */
  static canPreviewFile(fileType: FileType, mimeType: string): boolean {
    switch (fileType) {
      case 'image':
        return ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'].includes(mimeType)
      case 'video':
        return ['video/mp4', 'video/webm'].includes(mimeType)
      case 'audio':
        return ['audio/mpeg', 'audio/wav', 'audio/ogg'].includes(mimeType)
      case 'document':
        return mimeType === 'application/pdf' || mimeType.startsWith('text/')
      case 'code':
        return mimeType.startsWith('text/') || mimeType === 'application/json'
      default:
        return false
    }
  }

  /**
   * Get preview type for file
   */
  static getPreviewType(fileType: FileType, mimeType: string): FilePreview['type'] | null {
    if (fileType === 'image') return 'image'
    if (fileType === 'video') return 'video'
    if (fileType === 'audio') return 'audio'
    if (mimeType === 'application/pdf') return 'document'
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return fileType === 'code' ? 'code' : 'text'
    }
    return null
  }

  /**
   * Transform raw database response to FileAttachment
   */
  static fromDatabase(data: any): FileAttachment {
    return {
      id: data.id,
      filename: data.name || data.filename,
      original_filename: data.original_name || data.original_filename,
      mime_type: data.mime_type,
      file_type: data.file_type || FileAttachmentModel.getFileTypeFromMime(data.mime_type),
      size_bytes: data.size_bytes,
      storage_path: data.storage_path || '',
      public_url: data.url || data.public_url,
      thumbnail_url: data.thumbnail_url,
      entity_type: data.project_id ? 'project' : data.milestone_id ? 'milestone' : data.entity_type,
      entity_id: data.project_id || data.milestone_id || data.entity_id,
      uploaded_by: data.uploaded_by,
      uploaded_by_name: data.uploaded_by_name || '',
      access_level: data.access_level || 'private',
      status: data.status || 'completed',
      upload_progress: data.upload_progress || 100,
      error_message: data.error_message,
      metadata: data.metadata || {},
      tags: data.tags || [],
      version: data.version || 1,
      is_deleted: data.is_deleted || false,
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
      deleted_at: data.deleted_at
    }
  }
}
