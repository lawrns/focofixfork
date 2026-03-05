import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFileUpload } from '../use-file-upload'

class MockXHR {
  static nextStatus = 200
  static nextResponse = { success: true, url: 'http://example.com/file.pdf' }

  status = 200
  responseText = ''
  upload = {
    addEventListener: vi.fn((event: string, cb: any) => {
      this.uploadListeners[event] = cb
    }),
  }

  private listeners: Record<string, Function> = {}
  private uploadListeners: Record<string, Function> = {}

  open = vi.fn()
  send = vi.fn(() => {
    this.status = MockXHR.nextStatus
    this.responseText = JSON.stringify(MockXHR.nextResponse)

    this.uploadListeners.progress?.({ lengthComputable: true, loaded: 1, total: 2 })
    this.uploadListeners.progress?.({ lengthComputable: true, loaded: 2, total: 2 })
    this.listeners.load?.()
  })

  abort = vi.fn(() => {
    this.listeners.abort?.()
  })

  addEventListener = vi.fn((event: string, cb: any) => {
    this.listeners[event] = cb
  })
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockXHR.nextStatus = 200
    MockXHR.nextResponse = { success: true, url: 'http://example.com/file.pdf' }
    vi.stubGlobal('XMLHttpRequest', MockXHR as any)
  })

  it('initializes default state', () => {
    const { result } = renderHook(() => useFileUpload())

    expect(result.current.isUploading).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.fileName).toBeNull()
  })

  it('rejects disallowed file type', async () => {
    const { result } = renderHook(() =>
      useFileUpload({ allowedTypes: ['image/png'] })
    )

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

    await expect(
      act(async () => {
        await result.current.uploadFile(file, 'task', 'task-1')
      })
    ).rejects.toThrow(/validation failed/i)
  })

  it('uploads file and reports completion/progress', async () => {
    const onComplete = vi.fn()
    const onProgress = vi.fn()
    const { result } = renderHook(() => useFileUpload({ onComplete, onProgress }))

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file, 'task', 'task-1')
    })

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false)
      expect(result.current.progress).toBe(100)
      expect(onProgress).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
