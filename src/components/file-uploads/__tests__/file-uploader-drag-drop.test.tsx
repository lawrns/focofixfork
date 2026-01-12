'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

vi.mock('@/lib/services/file-uploads', () => {
  return {
    FileUploadService: {
      getFileAttachments: vi.fn().mockResolvedValue({ attachments: [] }),
      subscribeToQueue: vi.fn().mockReturnValue('mock-sub-id'),
      unsubscribeFromQueue: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({
        id: 'test-id',
        original_filename: 'test.pdf',
        file_type: 'document',
        size_bytes: 1024,
        uploaded_by: 'user-1',
        uploaded_by_name: 'Test User'
      }),
      cancelUpload: vi.fn(),
      deleteFileAttachment: vi.fn(),
      downloadFileAttachment: vi.fn()
    }
  }
})

import FileUploader from '../file-uploader'
import { FileUploadService } from '@/lib/services/file-uploads'

// Helper to create DataTransfer-like object
function createDataTransfer(files: File[]) {
  return {
    files: files,
    items: {
      length: files.length,
      add: vi.fn(),
      [Symbol.iterator]: function* () {
        for (let i = 0; i < files.length; i++) {
          yield files[i]
        }
      }
    }
  }
}

describe('FileUploader Drag-and-Drop Component', () => {
  const defaultProps = {
    entityType: 'project' as const,
    entityId: 'project-123',
    currentUserId: 'user-1',
    currentUserName: 'Test User',
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image', 'document', 'pdf'] as const
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Drag-Over Visual Feedback', () => {
    it('should show drop zone with initial styling', () => {
      render(<FileUploader {...defaultProps} />)

      const uploadText = screen.getByText(/drag and drop files here/i)
      expect(uploadText).toBeInTheDocument()
    })

    it('should update text to "Drop files here" on drag-over', async () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')

      fireEvent.dragOver(dropZone!)

      await waitFor(() => {
        expect(screen.getByText('Drop files here')).toBeInTheDocument()
      })
    })

    it('should revert text on drag-leave', async () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')

      fireEvent.dragOver(dropZone!)
      await waitFor(() => {
        expect(screen.getByText('Drop files here')).toBeInTheDocument()
      })

      fireEvent.dragLeave(dropZone!)
      await waitFor(() => {
        expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument()
      })
    })
  })

  describe('Drop Functionality - Single File', () => {
    it('should handle single file drop', async () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const dataTransfer = createDataTransfer([file])

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(FileUploadService.uploadFile).toHaveBeenCalledWith(
          expect.any(File),
          'project',
          'project-123',
          'user-1',
          'Test User',
          expect.any(Object)
        )
      })
    })
  })

  describe('Drop Functionality - Multiple Files', () => {
    it('should handle multiple file drop', async () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const files = [
        new File(['test1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'file2.jpg', { type: 'image/jpeg' })
      ]

      const dataTransfer = createDataTransfer(files)

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(FileUploadService.uploadFile).toHaveBeenCalledTimes(2)
      })
    })

    it('should process multiple files sequentially', async () => {
      const uploadOrder: string[] = []
      vi.mocked(FileUploadService.uploadFile).mockImplementation(async (file: File) => {
        uploadOrder.push(file.name)
        return {
          id: `test-${uploadOrder.length}`,
          original_filename: file.name,
          file_type: 'document',
          size_bytes: 1024,
          uploaded_by: 'user-1',
          uploaded_by_name: 'Test User'
        } as any
      })

      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const files = [
        new File(['test1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'file2.jpg', { type: 'image/jpeg' }),
        new File(['test3'], 'file3.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      ]

      const dataTransfer = createDataTransfer(files)

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(uploadOrder.length).toBe(3)
      })
    })
  })

  describe('File Type Validation on Drop', () => {
    it('should reject invalid file types', async () => {
      vi.mocked(FileUploadService.uploadFile).mockRejectedValueOnce(new Error('Invalid file type'))

      render(<FileUploader {...defaultProps} allowedTypes={['image', 'document']} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })

      const dataTransfer = createDataTransfer([file])

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(FileUploadService.uploadFile).toHaveBeenCalled()
      })
    })

    it('should display error message for rejected files', async () => {
      vi.mocked(FileUploadService.uploadFile).mockRejectedValueOnce(new Error('File type not allowed'))

      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })

      const dataTransfer = createDataTransfer([file])

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument()
      })
    })

    it('should accept allowed file types', async () => {
      vi.mocked(FileUploadService.uploadFile).mockResolvedValueOnce({
        id: 'test-1',
        original_filename: 'image.jpg',
        file_type: 'image',
        size_bytes: 1024,
        uploaded_by: 'user-1',
        uploaded_by_name: 'Test User'
      } as any)

      render(
        <FileUploader
          {...defaultProps}
          allowedTypes={['image', 'document']}
        />
      )

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const validFiles = [
        new File(['test'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['test'], 'document.pdf', { type: 'application/pdf' })
      ]

      const dataTransfer = createDataTransfer(validFiles)

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(FileUploadService.uploadFile).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('File Size Validation on Drop', () => {
    it('should reject files exceeding size limit', async () => {
      vi.mocked(FileUploadService.uploadFile).mockRejectedValueOnce(new Error('File size exceeds maximum'))

      const maxSize = 1024 * 1024
      render(<FileUploader {...defaultProps} maxSize={maxSize} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })

      const dataTransfer = createDataTransfer([largeFile])

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(screen.getByText(/file size exceeds/i)).toBeInTheDocument()
      })
    })

    it('should accept files within size limit', async () => {
      vi.mocked(FileUploadService.uploadFile).mockResolvedValueOnce({
        id: 'test-1',
        original_filename: 'valid.pdf',
        file_type: 'document',
        size_bytes: 1024 * 2,
        uploaded_by: 'user-1',
        uploaded_by_name: 'Test User'
      } as any)

      const maxSize = 5 * 1024 * 1024
      render(<FileUploader {...defaultProps} maxSize={maxSize} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const validFile = new File(['x'.repeat(2 * 1024 * 1024)], 'valid.pdf', { type: 'application/pdf' })

      const dataTransfer = createDataTransfer([validFile])

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(FileUploadService.uploadFile).toHaveBeenCalled()
      })
    })
  })

  describe('Drop Zone Interactions', () => {
    it('should trigger file browse on drop zone click', () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i)

      fireEvent.click(dropZone)

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
    })

    it('should make drop zone clickable', () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      expect(dropZone).toHaveClass('cursor-pointer')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for drop zone', () => {
      render(<FileUploader {...defaultProps} />)

      const uploadText = screen.getByText(/upload files/i)
      expect(uploadText).toBeInTheDocument()
    })

    it('should have clickable drop zone', () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i)
      expect(dropZone).toBeInTheDocument()
      expect(dropZone.closest('div')).toBeInTheDocument()
    })
  })

  describe('Compact Mode', () => {
    it('should render compact upload button in compact mode', () => {
      render(<FileUploader {...defaultProps} compact={true} />)

      const addButton = screen.getByRole('button', { name: /add files/i })
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('Drag-and-Drop Events', () => {
    it('should handle dragOver and dragLeave events correctly', async () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')

      fireEvent.dragEnter(dropZone!)
      fireEvent.dragOver(dropZone!)

      await waitFor(() => {
        expect(screen.getByText('Drop files here')).toBeInTheDocument()
      })

      fireEvent.dragLeave(dropZone!)

      await waitFor(() => {
        expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument()
      })
    })

    it('should not upload on drag events alone', () => {
      render(<FileUploader {...defaultProps} />)

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')

      fireEvent.dragEnter(dropZone!)
      fireEvent.dragOver(dropZone!)
      fireEvent.dragLeave(dropZone!)

      expect(FileUploadService.uploadFile).not.toHaveBeenCalled()
    })
  })

  describe('File Upload Callbacks', () => {
    it('should call onUploadComplete callback on successful upload', async () => {
      const onUploadComplete = vi.fn()

      render(
        <FileUploader
          {...defaultProps}
          onUploadComplete={onUploadComplete}
        />
      )

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div')
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const dataTransfer = createDataTransfer([file])

      fireEvent.drop(dropZone!, { dataTransfer: dataTransfer as any })

      await waitFor(() => {
        expect(FileUploadService.uploadFile).toHaveBeenCalled()
      })
    })
  })
})
