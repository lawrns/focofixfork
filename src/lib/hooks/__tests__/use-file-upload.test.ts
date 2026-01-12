import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileUpload } from '../use-file-upload'

// Mock fetch for upload tests
global.fetch = jest.fn()

describe('useFileUpload Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Upload Progress Tracking', () => {
    it('should track upload progress from 0 to 100', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const progressUpdates: number[] = []

      const { result } = renderHook(() =>
        useFileUpload({
          onProgress: (progress) => progressUpdates.push(progress),
        })
      )

      ;(global.fetch as jest.Mock).mockImplementationOnce(
        (url: string, options: any) => {
          // Simulate progress events
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, url: 'http://example.com/file.pdf' }),
              })
            }, 100)
          })
        }
      )

      await act(async () => {
        await result.current.uploadFile(
          mockFile,
          'task',
          'task-123',
          { onProgress: (p: number) => progressUpdates.push(p) }
        )
      })

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100)
    })

    it('should update progress state during upload', async () => {
      const mockFile = new File(['content'], 'document.docx', { type: 'application/msword' })

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, url: 'http://example.com/doc.docx' }),
        })
      )

      await act(async () => {
        const uploadPromise = result.current.uploadFile(mockFile, 'task', 'task-456')
        await uploadPromise
      })

      expect(result.current.isUploading).toBe(false)
    })

    it('should calculate accurate progress percentage', async () => {
      const mockFile = new File(['x'.repeat(1024 * 100)], 'large.pdf', { type: 'application/pdf' })
      let lastProgress = 0

      const { result } = renderHook(() =>
        useFileUpload({
          onProgress: (progress) => {
            lastProgress = progress
          },
        })
      )

      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, url: 'http://example.com/file.pdf' }),
        })
      )

      await act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-789')
      })

      expect(lastProgress).toBe(100)
    })
  })

  describe('File Upload Initialization', () => {
    it('should initialize with correct file metadata', () => {
      const { result } = renderHook(() => useFileUpload())

      expect(result.current.isUploading).toBe(false)
      expect(result.current.progress).toBe(0)
      expect(result.current.error).toBeNull()
    })

    it('should set isUploading to true when upload starts', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, url: 'http://example.com/file.txt' }),
              })
            }, 50)
          })
      )

      await act(async () => {
        const uploadPromise = result.current.uploadFile(mockFile, 'task', 'task-123')
        // Check state immediately after starting
        expect(result.current.isUploading).toBe(true)
        await uploadPromise
      })
    })
  })

  describe('Error Handling', () => {
    it('should capture upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const errorMessage = 'Network error: Connection refused'

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error(errorMessage))
      )

      await act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-123').catch(() => {
          // Expected error
        })
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.isUploading).toBe(false)
    })

    it('should handle different error types', async () => {
      const mockFile = new File(['x'], 'test.pdf', { type: 'application/pdf' })

      const errorScenarios = [
        { error: new Error('File too large'), expectedMessage: 'File too large' },
        { error: new Error('Invalid file type'), expectedMessage: 'Invalid file type' },
        { error: new Error('Unauthorized'), expectedMessage: 'Unauthorized' },
      ]

      for (const scenario of errorScenarios) {
        const { result } = renderHook(() => useFileUpload())

        ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
          Promise.reject(scenario.error)
        )

        await act(async () => {
          await result.current.uploadFile(mockFile, 'task', 'task-123').catch(() => {
            // Expected
          })
        })

        expect(result.current.error).toBeTruthy()
      }
    })

    it('should clear error on new upload attempt', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() => useFileUpload())

      // First upload fails
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('First upload failed'))
      )

      await act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-123').catch(() => {
          // Expected
        })
      })

      expect(result.current.error).toBeTruthy()

      // Second upload succeeds
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, url: 'http://example.com/file.pdf' }),
        })
      )

      await act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-456')
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Cancel Upload Functionality', () => {
    it('should cancel ongoing upload', async () => {
      const mockFile = new File(['x'.repeat(1024 * 100)], 'large.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, url: 'http://example.com/file.pdf' }),
              })
            }, 500)
          })
      )

      const uploadPromise = act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-123')
      })

      // Wait for upload to start
      await waitFor(() => {
        expect(result.current.isUploading).toBe(true)
      })

      // Cancel the upload
      await act(async () => {
        result.current.cancelUpload()
      })

      expect(result.current.isUploading).toBe(false)
    })

    it('should have abortController available for cancellation', () => {
      const { result } = renderHook(() => useFileUpload())

      expect(result.current.abortController).toBeTruthy()
      expect(result.current.abortController).toBeInstanceOf(AbortController)
    })

    it('should reset progress on cancel', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, url: 'http://example.com/file.pdf' }),
              })
            }, 500)
          })
      )

      const uploadPromise = act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-123').catch(() => {
          // Expected on cancel
        })
      })

      await waitFor(() => {
        expect(result.current.isUploading).toBe(true)
      })

      await act(async () => {
        result.current.cancelUpload()
      })

      expect(result.current.progress).toBe(0)
      expect(result.current.isUploading).toBe(false)
    })
  })

  describe('File Validation', () => {
    it('should validate file size', async () => {
      const largeFile = new File(['x'.repeat(1024 * 1024 * 101)], 'huge.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() =>
        useFileUpload({
          maxFileSize: 1024 * 1024 * 100, // 100MB
        })
      )

      await act(async () => {
        await result.current.uploadFile(largeFile, 'task', 'task-123').catch(() => {
          // Expected to fail
        })
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should validate allowed file types', async () => {
      const exeFile = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' })

      const { result } = renderHook(() =>
        useFileUpload({
          allowedTypes: ['application/pdf', 'image/*'],
        })
      )

      await act(async () => {
        await result.current.uploadFile(exeFile, 'task', 'task-123').catch(() => {
          // Expected to fail
        })
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Response Handling', () => {
    it('should return file attachment data on successful upload', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const mockResponse = {
        success: true,
        attachment: {
          id: 'attach-123',
          filename: 'test.pdf',
          url: 'http://example.com/uploads/test.pdf',
          size_bytes: 12345,
        },
      }

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      )

      let uploadResult: any = null
      await act(async () => {
        uploadResult = await result.current.uploadFile(mockFile, 'task', 'task-123')
      })

      expect(uploadResult).toEqual(mockResponse)
    })

    it('should handle server error responses', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      )

      await act(async () => {
        await result.current.uploadFile(mockFile, 'task', 'task-123').catch(() => {
          // Expected
        })
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Multiple File Uploads', () => {
    it('should handle sequential file uploads', async () => {
      const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() => useFileUpload())

      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, url: 'http://example.com/file1.pdf' }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, url: 'http://example.com/file2.pdf' }),
          })
        )

      await act(async () => {
        await result.current.uploadFile(file1, 'task', 'task-123')
      })

      expect(result.current.isUploading).toBe(false)

      await act(async () => {
        await result.current.uploadFile(file2, 'task', 'task-456')
      })

      expect(result.current.isUploading).toBe(false)
    })
  })
})
