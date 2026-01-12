'use client'

import React, { useRef } from 'react'
import { useFileUpload } from '@/lib/hooks/use-file-upload'
import { FileUploadProgress } from '@/components/ui/file-upload-progress'
import { Button } from '@/components/ui/button'
import { CloudUpload } from 'lucide-react'
import { toast } from 'sonner'

export interface FileUploadExampleProps {
  entityType: 'task' | 'project' | 'milestone' | 'comment'
  entityId: string
  onUploadComplete?: (attachment: any) => void
}

export function FileUploadExample({
  entityType,
  entityId,
  onUploadComplete,
}: FileUploadExampleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isMultiple, setIsMultiple] = React.useState(false)
  const [uploads, setUploads] = React.useState<
    Array<{
      id: string
      file: File
      isUploading: boolean
      progress: number
      error: string | null
      isComplete: boolean
    }>
  >([])

  const { uploadFile, isUploading, progress, error, fileName, cancelUpload } =
    useFileUpload({
      onProgress: (p) => {
        // Progress is automatically tracked
      },
      onComplete: (response) => {
        toast.success(`${fileName} uploaded successfully`)
        onUploadComplete?.(response.attachment)
      },
      onError: (err) => {
        toast.error(`Upload failed: ${err.message}`)
      },
    })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files
    if (!files) return

    if (isMultiple) {
      // Handle multiple files
      Array.from(files).forEach((file) => {
        const uploadId = `${file.name}-${Date.now()}`
        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            file,
            isUploading: true,
            progress: 0,
            error: null,
            isComplete: false,
          },
        ])

        // Upload each file
        uploadFile(file, entityType, entityId, {
          onProgress: (p) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId ? { ...u, progress: p } : u
              )
            )
          },
        })
          .then((response) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId
                  ? {
                      ...u,
                      isUploading: false,
                      progress: 100,
                      isComplete: true,
                    }
                  : u
              )
            )
            toast.success(`${file.name} uploaded successfully`)
          })
          .catch((err) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId
                  ? {
                      ...u,
                      isUploading: false,
                      error: err.message,
                    }
                  : u
              )
            )
          })
      })
    } else {
      // Single file upload
      const file = files[0]
      setSelectedFile(file)
      handleSingleUpload(file)
    }

    // Reset input
    event.currentTarget.value = ''
  }

  const handleSingleUpload = async (file: File) => {
    try {
      await uploadFile(file, entityType, entityId)
    } catch (err) {
      console.error('Upload error:', err)
    }
  }

  const handleCancel = () => {
    cancelUpload()
    setSelectedFile(null)
  }

  const toggleMultipleMode = () => {
    setIsMultiple(!isMultiple)
    setUploads([])
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          multiple={isMultiple}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png,.gif,.zip"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <CloudUpload className="h-4 w-4" />
          {isMultiple ? 'Upload Multiple Files' : 'Upload File'}
        </Button>

        <Button
          variant="outline"
          onClick={toggleMultipleMode}
          size="sm"
        >
          {isMultiple ? 'Switch to Single' : 'Switch to Multiple'}
        </Button>
      </div>

      {/* Single file upload progress */}
      {selectedFile && !isMultiple && (
        <FileUploadProgress
          isUploading={isUploading}
          progress={progress}
          fileName={selectedFile.name}
          isComplete={progress === 100 && !isUploading && !error}
          error={error}
          onCancel={handleCancel}
        />
      )}

      {/* Multiple file uploads */}
      {isMultiple && uploads.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Uploading {uploads.length} file{uploads.length !== 1 ? 's' : ''}
          </p>
          {uploads.map((upload) => (
            <FileUploadProgress
              key={upload.id}
              isUploading={upload.isUploading}
              progress={upload.progress}
              fileName={upload.file.name}
              isComplete={upload.isComplete}
              error={upload.error}
              onCancel={
                upload.isUploading
                  ? () => {
                      setUploads((prev) =>
                        prev.map((u) =>
                          u.id === upload.id
                            ? { ...u, isUploading: false }
                            : u
                        )
                      )
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
