import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentSourceManager } from '@/features/content-pipeline/components/content-source-manager';

describe('ContentSourceManager', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a normalized create-source error inline', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: {
          code: 'SOURCE_CREATE_FAILED',
          message: 'Source creation failed',
          timestamp: '2026-03-05T20:00:00.000Z',
        },
      }),
    });

    render(
      <ContentSourceManager
        projectId="project-123"
        sources={[]}
        isLoading={false}
        onSourcesChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /add source/i }));
    await user.type(screen.getByLabelText('Name'), 'TechCrunch RSS');
    await user.type(screen.getByLabelText('URL'), 'https://techcrunch.com/feed');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('Source creation failed')).toBeInTheDocument();
  });
});
