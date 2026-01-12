'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseFileUploadOptions {
  onProgress?: (progress: number) => void
  onComplete?: (response: any) => void
  onError?: (error: Error) => void
  maxFileSize?: number
  allowedTypes?: string[]
  uploadEndpoint?: string
}

export interface UseFileUploadReturn {
  isUploading: boolean
  progress: number
  error: string | null
  fileName: string | null
  abortController: AbortController
  uploadFile: (
    file: File,
    entityType: string,
    entityId: string,
    options?: { onProgress?: (progress: number) => void }
  ) => Promise<any>
  cancelUpload: () => void
  reset: () => void
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController>(new AbortController())
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const {
    onProgress,
    onComplete,
    onError,
    maxFileSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes,
    uploadEndpoint = '/api/files/upload',
  } = options

  // Validate file before upload
  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024))
        setError(`File size exceeds maximum limit of ${maxSizeMB}MB`)
        return false
      }

      // Check file type
      if (allowedTypes && !allowedTypes.some((type) => {
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0]
          return file.type.startsWith(baseType)
        }
        return file.type === type
      })) {
        setError(
          `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        )
        return false
      }

      return true
    },
    [maxFileSize, allowedTypes]
  )

  // Reset upload state
  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
    setFileName(null)
  }, [])

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort()
    }
    abortControllerRef.current.abort()
    // Create new abort controller for future uploads
    abortControllerRef.current = new AbortController()
    setIsUploading(false)
    setProgress(0)
  }, [])

  // Upload file
  const uploadFile = useCallback(
    async (
      file: File,
      entityType: string,
      entityId: string,
      uploadOptions?: { onProgress?: (progress: number) => void }
    ): Promise<any> => {
      // Validate file first
      if (!validateFile(file)) {
        setIsUploading(false)
        const validationError = error
        if (onError && validationError) {
          onError(new Error(validationError))
        }
        throw new Error(validationError || 'File validation failed')
      }

      // Reset state for new upload
      setError(null)
      setFileName(file.name)
      setProgress(0)
      setIsUploading(true)

      try {
        // Create FormData with file and metadata
        const formData = new FormData()
        formData.append('file', file)
        formData.append('entityType', entityType)
        formData.append('entityId', entityId)

        // Use XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhrRef.current = xhr

          // Progress event listener
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100)
              setProgress(percentComplete)

              // Call progress callbacks
              onProgress?.(percentComplete)
              uploadOptions?.onProgress?.(percentComplete)
            }
          })

          // Load event listener (success)
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText)
                setProgress(100)
                setIsUploading(false)
                setError(null)

                onComplete?.(response)
                resolve(response)
              } catch (parseError) {
                const err = parseError instanceof Error ? parseError : new Error('Failed to parse response')
                setError(err.message)
                setIsUploading(false)
                onError?.(err)
                reject(err)
              }
            } else {
              try {
                const response = JSON.parse(xhr.responseText)
                const errorMsg = response.error || `Upload failed with status ${xhr.status}`
                setError(errorMsg)
                setIsUploading(false)

                const err = new Error(errorMsg)
                onError?.(err)
                reject(err)
              } catch (parseError) {
                const errorMsg = `Upload failed with status ${xhr.status}`
                setError(errorMsg)
                setIsUploading(false)

                const err = new Error(errorMsg)
                onError?.(err)
                reject(err)
              }
            }
          })

          // Error event listener
          xhr.addEventListener('error', () => {
            const errorMsg = 'Network error during upload'
            setError(errorMsg)
            setIsUploading(false)

            const err = new Error(errorMsg)
            onError?.(err)
            reject(err)
          })

          // Abort event listener
          xhr.addEventListener('abort', () => {
            const errorMsg = 'Upload cancelled'
            setError(errorMsg)
            setIsUploading(false)

            const err = new Error(errorMsg)
            reject(err)
          })

          // Open and send request
          xhr.open('POST', uploadEndpoint)
          xhr.send(formData)
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed'
        setError(errorMsg)
        setIsUploading(false)

        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMsg))
        }
        throw err
      }
    },
    [validateFile, error, onProgress, onComplete, onError, uploadEndpoint]
  )

  // Create effect to handle abort controller cleanup
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort()
      }
    }
  }, [])

  return {
    isUploading,
    progress,
    error,
    fileName,
    abortController: abortControllerRef.current,
    uploadFile,
    cancelUpload,
    reset,
  }
}
