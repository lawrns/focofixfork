import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadProgress } from '../file-upload-progress'

describe('FileUploadProgress Component', () => {
  describe('Progress Bar Rendering', () => {
    it('should render progress bar during upload', () => {
      render(
        <FileUploadProgress
          isUploading={true}
          progress={50}
          fileName="test.pdf"
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('should display correct progress percentage', () => {
      render(
        <FileUploadProgress
          isUploading={true}
          progress={75}
          fileName="document.docx"
        />
      )

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should display file name during upload', () => {
      const fileName = 'my-project-plan.xlsx'
      render(
        <FileUploadProgress
          isUploading={true}
          progress={25}
          fileName={fileName}
        />
      )

      expect(screen.getByText(fileName)).toBeInTheDocument()
    })

    it('should update progress in real-time', async () => {
      const { rerender } = render(
        <FileUploadProgress
          isUploading={true}
          progress={0}
          fileName="large-file.zip"
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()

      rerender(
        <FileUploadProgress
          isUploading={true}
          progress={50}
          fileName="large-file.zip"
        />
      )

      expect(screen.getByText('50%')).toBeInTheDocument()

      rerender(
        <FileUploadProgress
          isUploading={true}
          progress={100}
          fileName="large-file.zip"
        />
      )

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Completion State', () => {
    it('should show success message at 100% completion', () => {
      render(
        <FileUploadProgress
          isUploading={false}
          progress={100}
          fileName="completed-file.pdf"
          isComplete={true}
        />
      )

      expect(screen.getByText('Upload complete')).toBeInTheDocument()
    })

    it('should hide progress bar after completion', () => {
      render(
        <FileUploadProgress
          isUploading={false}
          progress={100}
          fileName="completed-file.pdf"
          isComplete={true}
        />
      )

      const progressBar = screen.queryByRole('progressbar')
      expect(progressBar).not.toBeInTheDocument()
    })

    it('should display success icon after completion', () => {
      render(
        <FileUploadProgress
          isUploading={false}
          progress={100}
          fileName="completed-file.pdf"
          isComplete={true}
        />
      )

      const successIcon = screen.getByTestId('upload-success-icon')
      expect(successIcon).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when upload fails', () => {
      const errorMsg = 'File size exceeds maximum limit'
      render(
        <FileUploadProgress
          isUploading={false}
          progress={45}
          fileName="too-large-file.mp4"
          error={errorMsg}
        />
      )

      expect(screen.getByText(errorMsg)).toBeInTheDocument()
    })

    it('should show error icon on failure', () => {
      render(
        <FileUploadProgress
          isUploading={false}
          progress={30}
          fileName="corrupted.pdf"
          error="Network error"
        />
      )

      const errorIcon = screen.getByTestId('upload-error-icon')
      expect(errorIcon).toBeInTheDocument()
    })

    it('should display specific error types', () => {
      const testCases = [
        { error: 'File not found' },
        { error: 'Permission denied' },
        { error: 'Connection timeout' },
        { error: 'Invalid file format' },
      ]

      testCases.forEach(({ error }) => {
        const { unmount } = render(
          <FileUploadProgress
            isUploading={false}
            progress={20}
            fileName="file.pdf"
            error={error}
          />
        )

        expect(screen.getByText(error)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Cancel Upload Functionality', () => {
    it('should render cancel button during upload', () => {
      render(
        <FileUploadProgress
          isUploading={true}
          progress={50}
          fileName="test.pdf"
          onCancel={jest.fn()}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should call onCancel callback when cancel button is clicked', async () => {
      const onCancel = jest.fn()
      render(
        <FileUploadProgress
          isUploading={true}
          progress={50}
          fileName="test.pdf"
          onCancel={onCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should disable cancel button after upload completes', () => {
      render(
        <FileUploadProgress
          isUploading={false}
          progress={100}
          fileName="test.pdf"
          isComplete={true}
          onCancel={jest.fn()}
        />
      )

      const cancelButton = screen.queryByRole('button', { name: /cancel/i })
      expect(cancelButton).not.toBeInTheDocument()
    })

    it('should disable cancel button on error', () => {
      render(
        <FileUploadProgress
          isUploading={false}
          progress={50}
          fileName="test.pdf"
          error="Upload failed"
          onCancel={jest.fn()}
        />
      )

      const cancelButton = screen.queryByRole('button', { name: /cancel/i })
      expect(cancelButton).not.toBeInTheDocument()
    })
  })

  describe('Progress Bar Styling', () => {
    it('should have correct ARIA attributes for accessibility', () => {
      render(
        <FileUploadProgress
          isUploading={true}
          progress={60}
          fileName="test.pdf"
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should display file size information if provided', () => {
      render(
        <FileUploadProgress
          isUploading={true}
          progress={50}
          fileName="test.pdf"
          currentSize="25 MB"
          totalSize="50 MB"
        />
      )

      expect(screen.getByText(/25 MB.*50 MB/)).toBeInTheDocument()
    })
  })

  describe('Integration with Upload Process', () => {
    it('should handle multiple sequential uploads', async () => {
      const { rerender, unmount } = render(
        <FileUploadProgress
          isUploading={true}
          progress={50}
          fileName="file1.pdf"
        />
      )

      expect(screen.getByText('file1.pdf')).toBeInTheDocument()

      // Simulate first file completing
      rerender(
        <FileUploadProgress
          isUploading={false}
          progress={100}
          fileName="file1.pdf"
          isComplete={true}
        />
      )

      expect(screen.getByText('Upload complete')).toBeInTheDocument()

      unmount()

      // Start second upload
      const { rerender: rerender2 } = render(
        <FileUploadProgress
          isUploading={true}
          progress={0}
          fileName="file2.docx"
        />
      )

      expect(screen.getByText('file2.docx')).toBeInTheDocument()
    })

    it('should reset progress state correctly', () => {
      const { rerender } = render(
        <FileUploadProgress
          isUploading={true}
          progress={75}
          fileName="test.pdf"
        />
      )

      expect(screen.getByText('75%')).toBeInTheDocument()

      // Reset for new upload
      rerender(
        <FileUploadProgress
          isUploading={true}
          progress={0}
          fileName="new-file.pdf"
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('new-file.pdf')).toBeInTheDocument()
    })
  })
})
