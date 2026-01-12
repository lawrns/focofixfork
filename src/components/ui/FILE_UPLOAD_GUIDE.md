# File Upload Progress Indicator Implementation

## Overview

This implementation provides a complete file upload system with real-time progress tracking, error handling, and upload cancellation. It uses XMLHttpRequest (XHR) for fine-grained progress event handling and includes a progress bar component with comprehensive error states.

## Components

### 1. FileUploadProgress Component

A React component that displays the progress bar and upload status.

**Location**: `/src/components/ui/file-upload-progress.tsx`

**Props**:
```typescript
interface FileUploadProgressProps {
  isUploading: boolean
  progress: number
  fileName: string
  isComplete?: boolean
  error?: string | null
  onCancel?: () => void
  currentSize?: string
  totalSize?: string
  className?: string
}
```

**Features**:
- Real-time progress percentage display
- File name display
- Cancel button during upload
- Success state at 100% with checkmark
- Error state with error message
- File size information (optional)
- Accessibility attributes (ARIA)

**Usage**:
```tsx
import { FileUploadProgress } from '@/components/ui/file-upload-progress'

<FileUploadProgress
  isUploading={isUploading}
  progress={progress}
  fileName="document.pdf"
  isComplete={progress === 100 && !isUploading}
  error={error}
  onCancel={handleCancel}
/>
```

### 2. useFileUpload Hook

A React hook that manages file upload state and functionality.

**Location**: `/src/lib/hooks/use-file-upload.ts`

**Returns**:
```typescript
interface UseFileUploadReturn {
  isUploading: boolean
  progress: number
  error: string | null
  fileName: string | null
  abortController: AbortController
  uploadFile: (file: File, entityType: string, entityId: string, options?: { onProgress?: (progress: number) => void }) => Promise<any>
  cancelUpload: () => void
  reset: () => void
}
```

**Options**:
```typescript
interface UseFileUploadOptions {
  onProgress?: (progress: number) => void
  onComplete?: (response: any) => void
  onError?: (error: Error) => void
  maxFileSize?: number // Default: 100MB
  allowedTypes?: string[] // e.g., ['image/*', 'application/pdf']
  uploadEndpoint?: string // Default: '/api/files/upload'
}
```

**Features**:
- Automatic file validation (size, type)
- Progress tracking via XMLHttpRequest
- Error handling and reporting
- Upload cancellation support
- Callbacks for progress, completion, and errors

**Usage**:
```tsx
import { useFileUpload } from '@/lib/hooks/use-file-upload'

const { isUploading, progress, error, uploadFile, cancelUpload } = useFileUpload({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/*', 'application/pdf'],
  onProgress: (p) => console.log(`Progress: ${p}%`),
  onComplete: (response) => console.log('Upload complete', response),
  onError: (err) => console.error('Upload failed', err),
})

// Upload file
const file = fileInputRef.current?.files?.[0]
if (file) {
  await uploadFile(file, 'task', 'task-123')
}

// Cancel upload
cancelUpload()
```

### 3. Upload API Endpoint

Handles file uploads with validation and storage.

**Location**: `/src/app/api/files/upload/route.ts`

**Request**:
```
POST /api/files/upload
Content-Type: multipart/form-data

file: File
entityType: 'task' | 'project' | 'milestone' | 'comment'
entityId: string
```

**Response**:
```typescript
{
  success: true
  attachment: {
    id: string
    filename: string
    original_filename: string
    mime_type: string
    file_type: FileType
    size_bytes: number
    storage_path: string
    entity_type: string
    entity_id: string
    uploaded_by: string
    uploaded_by_name: string
    access_level: 'private' | 'organization' | 'project' | 'public'
    status: 'uploading' | 'completed' | 'failed' | 'cancelled'
    created_at: string
    updated_at: string
  }
  message: string
}
```

**Features**:
- FormData parsing
- File validation using FileAttachmentModel
- Entity type resolution
- Workspace association
- Metadata storage

## File Upload Flow

```
User selects file
    ↓
useFileUpload validates file (size, type)
    ↓
uploadFile creates FormData and XMLHttpRequest
    ↓
XMLHttpRequest.upload.addEventListener('progress', ...)
    ↓
Progress updates → setProgress → re-render FileUploadProgress
    ↓
XMLHttpRequest listener 'load' fires
    ↓
Parse response and update state
    ↓
Call onComplete callback
    ↓
Display success state in FileUploadProgress
```

## Example Implementation

### Basic Single File Upload

```tsx
'use client'

import { useRef } from 'react'
import { useFileUpload } from '@/lib/hooks/use-file-upload'
import { FileUploadProgress } from '@/components/ui/file-upload-progress'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function TaskAttachmentUpload({ taskId }: { taskId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isUploading, progress, error, fileName, uploadFile, cancelUpload } = useFileUpload({
    maxFileSize: 25 * 1024 * 1024, // 25MB
    onComplete: (response) => {
      toast.success('File uploaded successfully')
    },
    onError: (err) => {
      toast.error(`Upload failed: ${err.message}`)
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      try {
        await uploadFile(file, 'task', taskId)
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    e.currentTarget.value = ''
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()}>
        Upload Attachment
      </Button>

      {fileName && (
        <FileUploadProgress
          isUploading={isUploading}
          progress={progress}
          fileName={fileName}
          isComplete={progress === 100 && !isUploading && !error}
          error={error}
          onCancel={cancelUpload}
        />
      )}
    </div>
  )
}
```

### Avatar Upload with Size Display

```tsx
'use client'

import { useRef, useState } from 'react'
import { useFileUpload } from '@/lib/hooks/use-file-upload'
import { FileUploadProgress } from '@/components/ui/file-upload-progress'

export function AvatarUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileSize, setFileSize] = useState('')
  const { isUploading, progress, error, fileName, uploadFile, cancelUpload } = useFileUpload({
    maxFileSize: 5 * 1024 * 1024, // 5MB for avatars
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      setFileSize(`${sizeMB} MB`)
      await uploadFile(file, 'organization', 'org-123')
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      <button onClick={() => fileInputRef.current?.click()}>
        Upload Avatar
      </button>

      {fileName && (
        <FileUploadProgress
          isUploading={isUploading}
          progress={progress}
          fileName={fileName}
          totalSize={fileSize}
          currentSize={`${Math.round((progress / 100) * parseFloat(fileSize))} MB`}
          isComplete={progress === 100 && !isUploading && !error}
          error={error}
          onCancel={cancelUpload}
        />
      )}
    </div>
  )
}
```

## Testing

### Component Tests
- `src/components/ui/__tests__/file-upload-progress.test.tsx`

**Test Coverage**:
- Progress bar rendering and updates
- Percentage display accuracy
- File name display
- Completion state with success icon
- Error state with error message
- Cancel button functionality
- Accessibility attributes

### Hook Tests
- `src/lib/hooks/__tests__/use-file-upload.test.ts`

**Test Coverage**:
- Progress tracking (0-100%)
- Upload initialization
- Error handling and recovery
- Cancel functionality
- File validation
- Response handling
- Multiple file uploads

## Key Features

### Progress Tracking
- XMLHttpRequest `upload.addEventListener('progress')` for accurate progress updates
- Real-time percentage display
- Optional file size information display

### Error Handling
- File size validation
- File type validation
- Network error handling
- Server error response handling
- User-friendly error messages

### Cancellation
- AbortController for request cancellation
- Immediate state reset
- Clean XHR abort

### Accessibility
- ARIA attributes on progress bar
- Semantic HTML with role="progressbar"
- Descriptive button labels
- Icon feedback (success/error)

### User Experience
- Real-time progress percentage
- File name display
- Current/total size information
- Clear success/error states
- Cancellation during upload
- No upload data loss on component unmount

## Browser Compatibility

- All modern browsers (Chrome, Firefox, Safari, Edge)
- XMLHttpRequest Level 2 with progress events
- FormData API
- AbortController

## File Size Limits

Default limits by file type (from FileAttachmentModel):
- Image: 10MB
- Document: 25MB
- Spreadsheet: 25MB
- Presentation: 50MB
- Video: 100MB
- Audio: 50MB
- Archive: 100MB
- Code: 5MB

These can be overridden per upload via `maxFileSize` option.

## Storage and Database

File attachments are stored with the following information:
- File metadata (size, type, mime type)
- Entity association (task, project, milestone, comment)
- Access level (private, organization, project, public)
- Upload timestamp
- Uploader information
- Workspace association

## Future Enhancements

1. **Chunked Upload**: For very large files, implement chunked uploads
2. **Resume Support**: Allow resuming interrupted uploads
3. **Drag & Drop**: Add drag-and-drop file selection
4. **Preview**: Display file previews before upload
5. **Batch Operations**: Manage multiple uploads in a queue
6. **Background Uploads**: Continue uploads in service worker
7. **Progress Persistence**: Store progress to localStorage for recovery
