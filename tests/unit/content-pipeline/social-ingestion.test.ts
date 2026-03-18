import { beforeEach, describe, expect, test, vi } from 'vitest'
import { writeFile } from 'fs/promises'

const {
  mockTranscribeAudio,
  mockAssertEgressAllowed,
  mockExecFile,
} = vi.hoisted(() => ({
  mockTranscribeAudio: vi.fn(),
  mockAssertEgressAllowed: vi.fn(),
  mockExecFile: vi.fn(),
}))

vi.mock('@/lib/security/egress-filter', () => ({
  assertEgressAllowed: mockAssertEgressAllowed,
}))

vi.mock('child_process', () => ({
  default: {
    execFile: mockExecFile,
  },
  execFile: mockExecFile,
}))

vi.mock('@/lib/ai/openai-whisper', () => ({
  transcribeAudio: mockTranscribeAudio,
}))

import { prepareApifyItemsForSource } from '@/features/content-pipeline/services/social-ingestion'

describe('social ingestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecFile.mockImplementation(async (_command, args, callback) => {
      const outputPath = args[args.length - 1]
      await writeFile(outputPath, Buffer.from('fake-mp3-audio'))
      callback?.(null)
    })
  })

  test('downloads and transcribes instagram videos locally', async () => {
    const videoBuffer = Buffer.from('fake-mp4-video')
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: {
        get: (key: string) => (key.toLowerCase() === 'content-type' ? 'video/mp4' : null),
      },
      arrayBuffer: async () => videoBuffer.buffer.slice(videoBuffer.byteOffset, videoBuffer.byteOffset + videoBuffer.byteLength),
    })))

    mockTranscribeAudio.mockResolvedValue({
      text: 'This is the spoken transcript.',
      language: 'en',
      duration: 12,
      confidence: 0.92,
    })

    const result = await prepareApifyItemsForSource(
      {
        id: 'source-1',
        project_id: 'project-1',
        name: 'Instagram: @creator',
        url: 'https://instagram.com/creator',
        type: 'apify',
        poll_interval_minutes: 120,
        headers: {
          __foco_platform: 'instagram',
        },
        status: 'active',
        error_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        {
          id: 'ig-post-1',
          caption: 'Five things we learned this week',
          videoUrl: 'https://cdn.example.com/video.mp4',
          postUrl: 'https://instagram.com/p/abc',
          timestamp: '2026-03-05T20:00:00.000Z',
          ownerUsername: 'creator',
          videoViewCount: 1200,
        },
      ]
    )

    expect(result.videoItemsDetected).toBe(1)
    expect(result.videosDownloaded).toBe(1)
    expect(result.transcriptsCompleted).toBe(1)
    expect(result.transcriptsFailed).toBe(0)
    expect(result.warnings).toEqual([])
    expect(mockExecFile).toHaveBeenCalledWith(
      'ffmpeg',
      expect.arrayContaining([
        '-i',
        expect.stringContaining('source-video.mp4'),
        expect.stringContaining('source-audio.mp3'),
      ]),
      expect.any(Function),
    )
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        caption_text: 'Five things we learned this week',
        transcript_text: 'This is the spoken transcript.',
        video_url: 'https://cdn.example.com/video.mp4',
        post_url: 'https://instagram.com/p/abc',
        download_status: 'complete',
        transcript_status: 'complete',
      })
    )
    expect(result.items[0].content).toContain('Transcript:')
  })

  test('keeps text-only social posts without transcription', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const result = await prepareApifyItemsForSource(
      {
        id: 'source-2',
        project_id: 'project-1',
        name: 'Twitter: @founder',
        url: 'https://x.com/founder',
        type: 'apify',
        poll_interval_minutes: 120,
        headers: {
          __foco_platform: 'twitter',
        },
        status: 'active',
        error_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        {
          id: 'tweet-1',
          fullText: 'Shipping beats meetings.',
          url: 'https://x.com/founder/status/1',
        },
      ]
    )

    expect(result.videoItemsDetected).toBe(0)
    expect(result.videosDownloaded).toBe(0)
    expect(result.transcriptsCompleted).toBe(0)
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        caption_text: 'Shipping beats meetings.',
        transcript_status: 'not_applicable',
        download_status: 'not_applicable',
      })
    )
    expect(mockTranscribeAudio).not.toHaveBeenCalled()
  })
})
