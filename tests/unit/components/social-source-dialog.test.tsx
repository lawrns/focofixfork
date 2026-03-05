import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialSourceDialog } from '@/features/content-pipeline/components/social-source-dialog';

describe('SocialSourceDialog', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a structured API error message instead of crashing', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: '2026-03-05T20:00:00.000Z',
        },
      }),
    });

    render(
      <SocialSourceDialog
        open
        onOpenChange={onOpenChange}
        projectId="project-123"
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText(/@elonmusk or username/i), 'openai');
    await user.click(screen.getByRole('button', { name: /add channel/i }));

    expect(await screen.findByText('Authentication required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
