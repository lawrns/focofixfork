'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Upload,
  X,
  File,
  Image,
  Video,
  Music,
  Archive,
  Code,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Download,
  Eye,
  Plus,
  UploadCloud,
  FolderOpen
} from 'lucide-react'
import { FileUploadService } from '@/lib/services/file-uploads'
import { FileAttachment, UploadQueueItem, FileAttachmentModel, FileType } from '@/lib/models/file-uploads'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  entityType: FileAttachment['entity_type']
  entityId: string
  currentUserId: string
  currentUserName: string
  maxFiles?: number
  allowedTypes?: FileType[]
  maxSize?: number // In bytes
  className?: string
  compact?: boolean
  showExisting?: boolean
  onUploadComplete?: (attachments: FileAttachment[]) => void
  onUploadError?: (error: string) => void
}

export default function FileUploader({
  entityType,
  entityId,
  currentUserId,
  currentUserName,
  maxFiles = 10,
  allowedTypes,
  maxSize,
  className,
  compact = false,
  showExisting = true,
  onUploadComplete,
  onUploadError
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const loadExistingFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const { attachments } = await FileUploadService.getFileAttachments(entityType, entityId)
      setExistingFiles(attachments)
    } catch (error) {
      console.error('Failed to load existing files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  // Load existing files on mount
  React.useEffect(() => {
    if (showExisting) {
      loadExistingFiles()
    }
  }, [showExisting, loadExistingFiles])

  // Subscribe to upload queue
  React.useEffect(() => {
    const subscriptionId = FileUploadService.subscribeToQueue(setUploadQueue)
    return () => FileUploadService.unsubscribeFromQueue(subscriptionId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    const currentUploads = uploadQueue.filter(item => item.status === 'uploading').length
    const totalFiles = existingFiles.length + currentUploads + files.length

    if (totalFiles > maxFiles) {
      setError(`Cannot upload more than ${maxFiles} files. You currently have ${existingFiles.length + currentUploads} files.`)
      return
    }

    setError(null)

    try {
      const uploadPromises = files.map(file =>
        FileUploadService.uploadFile(
          file,
          entityType,
          entityId,
          currentUserId,
          currentUserName,
          {
            allowedTypes,
            maxSize,
            generateThumbnail: true,
            onComplete: (attachment) => {
              setExistingFiles(prev => [attachment, ...prev])
              onUploadComplete?.([attachment])
            },
            onError: (error) => {
              setError(error)
              onUploadError?.(error)
            }
          }
        )
      )

      const results = await Promise.allSettled(uploadPromises)
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<FileAttachment>).value)

      if (successful.length > 0) {
        onUploadComplete?.(successful)
      }

      const failed = results.filter(result => result.status === 'rejected')
      if (failed.length > 0) {
        const errorMessages = failed.map(result =>
          (result as PromiseRejectedResult).reason?.message || 'Upload failed'
        )
        setError(`Some uploads failed: ${errorMessages.join(', ')}`)
      }

    } catch (error: any) {
      setError(error.message)
      onUploadError?.(error.message)
    }
  }, [maxFiles, existingFiles, uploadQueue, entityType, entityId, currentUserId, currentUserName, allowedTypes, maxSize, onUploadComplete, onUploadError])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFiles(files)
    }
  }, [handleFiles])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await handleFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCancelUpload = (queueId: string) => {
    FileUploadService.cancelUpload(queueId)
  }

  const handleDeleteFile = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      await FileUploadService.deleteFileAttachment(attachmentId, currentUserId)
      setExistingFiles(prev => prev.filter(file => file.id !== attachmentId))
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDownloadFile = async (attachmentId: string) => {
    try {
      await FileUploadService.downloadFileAttachment(attachmentId)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getFileIcon = (fileType: FileType) => {
    const iconClass = 'w-4 h-4'
    switch (fileType) {
      // eslint-disable-next-line jsx-a11y/alt-text
      case 'image': return <Image className={iconClass} aria-hidden="true" />
      case 'video': return <Video className={iconClass} aria-hidden="true" />
      case 'audio': return <Music className={iconClass} aria-hidden="true" />
      case 'archive': return <Archive className={iconClass} aria-hidden="true" />
      case 'code': return <Code className={iconClass} aria-hidden="true" />
      case 'document': return <FileText className={iconClass} aria-hidden="true" />
      default: return <File className={iconClass} aria-hidden="true" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default: return <Upload className="w-4 h-4 text-blue-600 animate-pulse" />
    }
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadQueue.some(item => item.status === 'uploading')}
        >
          <Plus className="w-4 h-4" />
          Add Files
        </Button>

        {uploadQueue.length > 0 && (
          <Badge variant="secondary">
            {uploadQueue.filter(item => item.status === 'uploading').length} uploading
          </Badge>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes ? allowedTypes.map(type =>
            (FileAttachmentModel.MIME_TYPES as any)[type]?.join(',') || ''
          ).filter(Boolean).join(',') : undefined}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5" />
          File Attachments
          {existingFiles.length > 0 && (
            <Badge variant="secondary">
              {existingFiles.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Zone */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            uploadQueue.some(item => item.status === 'uploading') && 'pointer-events-none opacity-50'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-lg font-medium mb-2">
            {isDragOver ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to browse
          </p>
          <div className="text-xs text-muted-foreground">
            {allowedTypes && (
              <div>Allowed types: {allowedTypes.join(', ')}</div>
            )}
            {maxSize && (
              <div>Max size: {FileAttachmentModel.formatFileSize(maxSize)}</div>
            )}
            <div>Max files: {maxFiles}</div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes ? allowedTypes.map(type =>
            (FileAttachmentModel.MIME_TYPES as any)[type]?.join(',') || ''
          ).filter(Boolean).join(',') : undefined}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Queue */}
        <AnimatePresence>
          {uploadQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <h4 className="font-medium">Uploads</h4>
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {getFileIcon(FileAttachmentModel.getFileTypeFromMime(item.file.type))}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {FileAttachmentModel.formatFileSize(item.file.size)}
                    </p>
                    {item.status === 'uploading' && (
                      <Progress value={item.progress} className="mt-2 h-1" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {item.status === 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelUpload(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Files */}
        {showExisting && existingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Attached Files</h4>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {existingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {getFileIcon(file.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {FileAttachmentModel.formatFileSize(file.size_bytes)} •
                        Uploaded by {file.uploaded_by_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(file.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      {file.uploaded_by === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
