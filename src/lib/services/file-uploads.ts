import { supabase } from '@/lib/supabase-client'
import {
  FileAttachment,
  UploadQueueItem,
  FilePreview,
  FilePermissions,
  FileStorageQuota,
  FileSearchFilters,
  FileUploadOptions,
  FileAttachmentModel,
  FileType
} from '@/lib/models/file-uploads'

const untypedSupabase = supabase as any

export class FileUploadService {
  private static uploadQueue: Map<string, UploadQueueItem> = new Map()
  private static listeners: Map<string, (queue: UploadQueueItem[]) => void> = new Map()

  /**
   * Upload a single file
   */
  static async uploadFile(
    file: File,
    entityType: FileAttachment['entity_type'],
    entityId: string,
    userId: string,
    userName: string,
    options: FileUploadOptions = {}
  ): Promise<FileAttachment> {
    // Validate file
    const validation = FileAttachmentModel.validateFile(file, options)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // Check permissions and quota
    await this.checkUploadPermissions(userId, file.size, entityType, entityId)

    // Generate storage path
    const storagePath = FileAttachmentModel.generateStoragePath(
      entityType,
      entityId,
      file.name,
      userId
    )

    // Create file attachment record - map to files table schema
    const attachmentData = {
      name: storagePath.split('/').pop()!,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
      url: '', // Will be updated after successful upload
      created_at: new Date().toISOString(),
      // Map entity relationships to files table fields
      ...(entityType === 'project' && { project_id: entityId }),
      ...(entityType === 'milestone' && { milestone_id: entityId })
    }

    const { data: attachment, error: insertError } = await untypedSupabase
      .from('files')
      .insert(attachmentData)
      .select()
      .single()

    if (insertError) throw insertError

    const fileAttachment = FileAttachmentModel.fromDatabase(attachment)

    try {
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Generate public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(storagePath)

      // Update attachment with the file URL
      const { data: updatedAttachment, error: updateError } = await untypedSupabase
        .from('files')
        .update({
          url: urlData.publicUrl
        })
        .eq('id', fileAttachment.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update quota
      await this.updateStorageQuota(userId, file.size)

      const finalAttachment = FileAttachmentModel.fromDatabase(updatedAttachment)
      options.onComplete?.(finalAttachment)
      return finalAttachment

    } catch (error: any) {
      // Delete the failed file record since we can't track status in the files table
      await untypedSupabase
        .from('files')
        .delete()
        .eq('id', fileAttachment.id)

      options.onError?.(error.message)
      throw error
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadFiles(
    files: File[],
    entityType: FileAttachment['entity_type'],
    entityId: string,
    userId: string,
    userName: string,
    options: FileUploadOptions = {}
  ): Promise<FileAttachment[]> {
    const results: FileAttachment[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const attachment = await this.uploadFile(file, entityType, entityId, userId, userName, options)
        results.push(attachment)
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All uploads failed: ${errors.join('; ')}`)
    }

    if (errors.length > 0) {
      console.warn('Some uploads failed:', errors)
    }

    return results
  }

  /**
   * Add file to upload queue for batch processing
   */
  static addToUploadQueue(
    file: File,
    entityType: FileAttachment['entity_type'],
    entityId: string,
    userId: string,
    userName: string,
    options: FileUploadOptions = {}
  ): string {
    const queueId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const queueItem: UploadQueueItem = {
      id: queueId,
      file,
      entity_type: entityType,
      entity_id: entityId,
      access_level: options.accessLevel || 'project',
      tags: options.tags || [],
      status: 'uploading',
      progress: 0,
      abortController: new AbortController()
    }

    this.uploadQueue.set(queueId, queueItem)
    this.notifyListeners()

    // Start upload
    this.processQueueItem(queueItem, userId, userName, options)

    return queueId
  }

  /**
   * Get upload queue
   */
  static getUploadQueue(): UploadQueueItem[] {
    return Array.from(this.uploadQueue.values())
  }

  /**
   * Subscribe to upload queue changes
   */
  static subscribeToQueue(callback: (queue: UploadQueueItem[]) => void): string {
    const id = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.listeners.set(id, callback)
    return id
  }

  /**
   * Unsubscribe from upload queue changes
   */
  static unsubscribeFromQueue(id: string): void {
    this.listeners.delete(id)
  }

  /**
   * Cancel upload
   */
  static cancelUpload(queueId: string): void {
    const item = this.uploadQueue.get(queueId)
    if (item) {
      item.abortController?.abort()
      item.status = 'cancelled'
      this.uploadQueue.delete(queueId)
      this.notifyListeners()
    }
  }

  /**
   * Get file attachments for entity
   */
  static async getFileAttachments(
    entityType: string,
    entityId: string,
    filters: FileSearchFilters = {}
  ): Promise<{ attachments: FileAttachment[]; total: number }> {
    let query = untypedSupabase
      .from('files')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Map entity type to appropriate field
    if (entityType === 'project' && entityId) {
      query = query.eq('project_id', entityId)
    } else if (entityType === 'milestone' && entityId) {
      query = query.eq('milestone_id', entityId)
    }

    if (filters.query) {
      query = query.ilike('original_name', `%${filters.query}%`)
    }

    if (filters.uploaded_by?.length) {
      query = query.in('uploaded_by', filters.uploaded_by)
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    if (filters.size_min) {
      query = query.gte('size_bytes', filters.size_min)
    }

    if (filters.size_max) {
      query = query.lt('size_bytes', filters.size_max)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      attachments: data?.map(item => FileAttachmentModel.fromDatabase(item)) || [],
      total: count || 0
    }
  }

  /**
   * Delete file attachment
   */
  static async deleteFileAttachment(
    attachmentId: string,
    userId: string
  ): Promise<void> {
    // Get attachment to check permissions
    const { data: attachment, error: fetchError } = await untypedSupabase
      .from('files')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (fetchError) throw fetchError

    const fileAttachment = FileAttachmentModel.fromDatabase(attachment)

    // Check permissions (implement proper permission checking)
    if (fileAttachment.uploaded_by !== userId) {
      // TODO: Check if user has delete permissions for this entity
      throw new Error('You do not have permission to delete this file')
    }

    // Delete the attachment (hard delete since files table doesn't support soft delete)
    const { error: deleteError } = await untypedSupabase
      .from('files')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) throw deleteError

    // Update storage quota
    await this.updateStorageQuota(userId, -fileAttachment.size_bytes)

    // TODO: Optionally delete from storage (with retention policy)
  }

  /**
   * Download file attachment
   */
  static async downloadFileAttachment(attachmentId: string): Promise<void> {
    const { data: attachment, error } = await untypedSupabase
      .from('files')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (error) throw error

    const fileAttachment = FileAttachmentModel.fromDatabase(attachment)

    if (!fileAttachment.public_url) {
      throw new Error('File URL not available')
    }

    // Create download link
    const link = document.createElement('a')
    link.href = fileAttachment.public_url
    link.download = fileAttachment.original_filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Get file preview
   */
  static async getFilePreview(attachmentId: string): Promise<FilePreview> {
    const { data: attachment, error } = await untypedSupabase
      .from('files')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (error) throw error

    const fileAttachment = FileAttachmentModel.fromDatabase(attachment)

    // Simple preview type detection based on mime type
    let previewType: 'image' | 'video' | 'audio' | 'document' | 'text' | 'code' = 'document'
    if (fileAttachment.mime_type) {
      if (fileAttachment.mime_type.startsWith('image/')) {
        previewType = 'image'
      } else if (fileAttachment.mime_type.startsWith('text/')) {
        previewType = 'text'
      } else if (fileAttachment.mime_type.startsWith('video/')) {
        previewType = 'video'
      } else if (fileAttachment.mime_type.startsWith('audio/')) {
        previewType = 'audio'
      } else if (fileAttachment.mime_type === 'application/pdf') {
        previewType = 'document'
      } else if (fileAttachment.mime_type === 'application/javascript' || 
                 fileAttachment.mime_type === 'application/typescript' ||
                 fileAttachment.mime_type === 'text/javascript' ||
                 fileAttachment.mime_type === 'application/json') {
        previewType = 'code'
      }
    }

    // Get file content for text preview
    let content: string | undefined
    if ((previewType === 'text' || previewType === 'code') && fileAttachment.public_url) {
      try {
        const response = await fetch(fileAttachment.public_url)
        content = await response.text()
      } catch (error) {
        console.warn('Failed to fetch file content for preview:', error)
      }
    }

    return {
      url: fileAttachment.public_url || '',
      type: previewType,
      content,
      metadata: fileAttachment.metadata,
      canPreview: true
    }
  }

  /**
   * Get user permissions for file operations
   */
  static async getUserPermissions(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<FilePermissions> {
    // TODO: Implement proper permission checking based on user role and entity access
    // For now, return default permissions

    const quota = await this.getStorageQuota(userId)

    return {
      can_upload: true,
      can_download: true,
      can_delete: true,
      can_share: true,
      max_file_size: 25 * 1024 * 1024, // 25MB
      allowed_types: ['document', 'image', 'spreadsheet', 'presentation'],
      storage_quota: quota.total_quota,
      storage_used: quota.used_quota
    }
  }

  /**
   * Get storage quota for user
   */
  static async getStorageQuota(userId: string): Promise<FileStorageQuota> {
    // Note: Quota management requires file_storage_quotas table (not yet in schema)
    // For now, return default unlimited quota
    return {
      user_id: userId,
      workspace_id: undefined,
      total_quota: 1024 * 1024 * 1024 * 10, // 10GB default
      used_quota: 0,
      file_count: 0,
      last_updated: new Date().toISOString()
    }
  }

  /**
   * Private methods
   */

  private static async processQueueItem(
    item: UploadQueueItem,
    userId: string,
    userName: string,
    options: FileUploadOptions
  ): Promise<void> {
    try {
      const attachment = await this.uploadFile(
        item.file,
        item.entity_type,
        item.entity_id,
        userId,
        userName,
        {
          ...options,
          accessLevel: item.access_level,
          tags: item.tags,
          onProgress: (progress) => {
            item.progress = progress
            this.notifyListeners()
            options.onProgress?.(progress)
          }
        }
      )

      item.status = 'completed'
      item.attachment = attachment
      options.onComplete?.(attachment)

    } catch (error: any) {
      item.status = 'failed'
      item.error = error.message
      options.onError?.(error.message)
    }

    this.notifyListeners()
  }

  private static async checkUploadPermissions(
    userId: string,
    fileSize: number,
    entityType: string,
    entityId: string
  ): Promise<void> {
    const permissions = await this.getUserPermissions(userId, entityType, entityId)

    if (!permissions.can_upload) {
      throw new Error('You do not have permission to upload files')
    }

    if (fileSize > permissions.max_file_size) {
      throw new Error(`File size exceeds maximum allowed size of ${FileAttachmentModel.formatFileSize(permissions.max_file_size)}`)
    }

    const quota = await this.getStorageQuota(userId)
    if (quota.used_quota + fileSize > quota.total_quota) {
      throw new Error('Upload would exceed storage quota')
    }
  }

  private static async generateThumbnail(file: File, storagePath: string): Promise<string | undefined> {
    // TODO: Implement thumbnail generation for images
    // This would typically use a service like Cloudinary or a server-side image processor
    return undefined
  }

  private static async extractFileMetadata(file: File, fileType: FileType): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {}

    try {
      if (fileType === 'image') {
        // Extract image metadata
        const img = new Image()
        const url = URL.createObjectURL(file)

        await new Promise((resolve, reject) => {
          img.onload = () => {
            metadata.width = img.width
            metadata.height = img.height
            URL.revokeObjectURL(url)
            resolve(undefined)
          }
          img.onerror = reject
          img.src = url
        })
      }

      // Add file checksum
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      metadata.checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    } catch (error) {
      console.warn('Failed to extract file metadata:', error)
    }

    return metadata
  }

  private static async updateStorageQuota(userId: string, sizeDelta: number): Promise<void> {
    // Note: Quota management requires file_storage_quotas table (not yet in schema)
    // For now, quota updates are disabled
    console.log(`Storage quota update: user ${userId}, delta ${sizeDelta} bytes`)
  }

  private static notifyListeners(): void {
    const queue = this.getUploadQueue()
    this.listeners.forEach(callback => callback(queue))
  }
}


