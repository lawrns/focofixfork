import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarUpload } from '../avatar-upload';

// Mock lucide-react
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Upload: () => <svg data-testid="upload-icon" />,
    AlertCircle: () => <svg data-testid="alert-circle-icon" />,
    Loader2: () => <svg data-testid="loader-icon" />,
  };
});

// Mock fetch
global.fetch = vi.fn();

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((event: any) => void) | null = null;

  readAsDataURL() {
    if (this.onload) {
      this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      this.onload({ target: this });
    }
  }
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader,
  writable: true,
});

describe('AvatarUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render avatar upload input', () => {
    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i);
    expect(input).toBeInTheDocument();
  });

  it('should show preview immediately after selecting an image file', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;

    const file = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });

    await user.upload(input, file);

    await waitFor(() => {
      const preview = screen.getByAltText(/avatar preview/i) as HTMLImageElement;
      expect(preview).toBeInTheDocument();
      expect(preview.src).toContain('data:image');
    });
  });

  it('should validate image file type', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/must be an image/i)).toBeInTheDocument();
    });
  });

  it('should validate file size (max 5MB)', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;

    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    await user.upload(input, largeFile);

    await waitFor(() => {
      expect(screen.getByText(/file size must be less than 5MB/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during upload', async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({ url: 'new-avatar.jpg' }) }), 100)
        )
    );

    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });

    await user.upload(input, file);

    // Wait for preview to show
    await waitFor(() => {
      expect(screen.getByAltText(/avatar preview/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Upload'));
    expect(uploadButton).toBeDefined();
    if (uploadButton) {
      await user.click(uploadButton);

      // Check loading state - button should be disabled during upload
      await waitFor(() => {
        expect(uploadButton).toBeDisabled();
      });

      // Wait for upload to complete
      await waitFor(() => {
        expect(uploadButton).not.toBeDisabled();
      }, { timeout: 3000 });
    }
  });

  it('should call onUploadComplete callback on successful upload', async () => {
    const user = userEvent.setup();
    const onUploadComplete = vi.fn();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'new-avatar-url.jpg' }),
    });

    render(<AvatarUpload onUploadComplete={onUploadComplete} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });

    await user.upload(input, file);

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByAltText(/avatar preview/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('new-avatar-url.jpg');
    });
  });

  it('should show error message on failed upload', async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Upload failed' }),
    });

    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });

    await user.upload(input, file);

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByAltText(/avatar preview/i)).toBeInTheDocument();
    });

    const uploadButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Upload'));
    expect(uploadButton).toBeDefined();
    if (uploadButton) {
      await user.click(uploadButton);

      // Should show error after failed upload
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });
    }
  });

  it('should accept jpg, png, webp, and gif formats', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;

    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  });

  it('should clear preview and error when input changes', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload onUploadComplete={vi.fn()} />);

    const input = screen.getByLabelText(/upload avatar/i) as HTMLInputElement;
    const file1 = new File(['content1'], 'avatar1.jpg', { type: 'image/jpeg' });

    await user.upload(input, file1);

    // Verify preview shows
    await waitFor(() => {
      expect(screen.getByAltText(/avatar preview/i)).toBeInTheDocument();
    });

    // Upload a new file
    const file2 = new File(['content2'], 'avatar2.jpg', { type: 'image/jpeg' });
    await user.upload(input, file2);

    // New preview should be there (old one replaced)
    await waitFor(() => {
      const preview = screen.getByAltText(/avatar preview/i) as HTMLImageElement;
      expect(preview).toBeInTheDocument();
    });
  });
});
