import crypto from 'crypto'
import { execFile } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { assertEgressAllowed } from '@/lib/security/egress-filter'
import { transcribeAudio } from '@/lib/ai/openai-whisper'
import type { FeatureFlagContext } from '@/lib/feature-flags/feature-flags'
import type { ContentSource, RawContentItem } from '../types'
import { getSourcePlatform } from '../server/source-record'
const VIDEO_PLATFORMS = new Set(['instagram', 'twitter'])
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm']
const VIDEO_URL_HINTS = ['video', 'playback', 'variant', 'stream', 'download', 'src']
const IMAGE_URL_HINTS = ['image', 'thumbnail', 'display', 'cover', 'poster']

type PreparedSocialBatch = {
  items: RawContentItem[]
  videoItemsDetected: number
  videosDownloaded: number
  transcriptsCompleted: number
  transcriptsFailed: number
  warnings: string[]
}

type TranscriptionOutcome = {
  transcriptText?: string
  downloadStatus: RawContentItem['download_status']
  transcriptStatus: RawContentItem['transcript_status']
  downloaded: boolean
  warning?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function collectMatchingValues(
  input: unknown,
  predicate: (key: string, value: unknown) => boolean,
  seen = new Set<unknown>(),
  results: unknown[] = []
): unknown[] {
  if (!input || seen.has(input)) return results

  if (Array.isArray(input)) {
    seen.add(input)
    for (const item of input) {
      collectMatchingValues(item, predicate, seen, results)
    }
    return results
  }

  if (!isRecord(input)) return results

  seen.add(input)
  for (const [key, value] of Object.entries(input)) {
    if (predicate(key, value)) {
      results.push(value)
    }
    if (Array.isArray(value) || isRecord(value)) {
      collectMatchingValues(value, predicate, seen, results)
    }
  }

  return results
}

function firstString(input: unknown, keys: string[]): string | undefined {
  const keySet = new Set(keys.map((key) => key.toLowerCase()))
  const values = collectMatchingValues(input, (key, value) => {
    return typeof value === 'string' && keySet.has(key.toLowerCase())
  })

  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function firstNumber(input: unknown, keys: string[]): number | undefined {
  const keySet = new Set(keys.map((key) => key.toLowerCase()))
  const values = collectMatchingValues(input, (key, value) => {
    return (typeof value === 'number' || typeof value === 'string') && keySet.has(key.toLowerCase())
  })

  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return undefined
}

function collectUrlsByHints(input: unknown, hints: string[]): string[] {
  const loweredHints = hints.map((hint) => hint.toLowerCase())
  const values = collectMatchingValues(input, (key, value) => {
    return typeof value === 'string' && /^https?:\/\//i.test(value) && loweredHints.some((hint) => key.toLowerCase().includes(hint))
  })

  return Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()))
  )
}

function pickBestVideoUrl(input: unknown): string | undefined {
  const candidates = collectUrlsByHints(input, VIDEO_URL_HINTS)
  if (candidates.length === 0) return undefined

  const scored = candidates
    .map((url) => {
      const lower = url.toLowerCase()
      let score = 0
      if (VIDEO_EXTENSIONS.some((ext) => lower.includes(ext))) score += 4
      if (lower.includes('.mp4')) score += 3
      if (lower.includes('hd')) score += 1
      if (lower.includes('.m3u8')) score -= 3
      if (lower.includes('thumbnail')) score -= 4
      return { url, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored[0]?.url
}

function buildExternalId(item: Record<string, unknown>, fallbackSeed: string): string {
  const raw = firstString(item, ['id', 'code', 'shortCode', 'shortcode', 'postUrl', 'url', 'link']) ?? fallbackSeed
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function detectContentType(item: Record<string, unknown>, hasVideo: boolean): string {
  const explicitType = firstString(item, ['type', 'mediaType', 'media_type', 'productType', 'product_type'])
  if (explicitType) return explicitType.toLowerCase()
  if (hasVideo) return 'video'
  return 'post'
}

function buildAnalysisText(input: {
  title?: string
  captionText?: string
  transcriptText?: string
  authorName?: string
  publishedAt?: string
  platform?: string | null
  contentType?: string
  engagement?: Record<string, unknown>
}): string {
  const lines: string[] = []

  if (input.platform) lines.push(`Platform: ${input.platform}`)
  if (input.authorName) lines.push(`Author: ${input.authorName}`)
  if (input.contentType) lines.push(`Content type: ${input.contentType}`)
  if (input.title) lines.push(`Title: ${input.title}`)
  if (input.publishedAt) lines.push(`Published at: ${input.publishedAt}`)
  if (input.captionText) lines.push(`Caption:\n${input.captionText}`)
  if (input.transcriptText) lines.push(`Transcript:\n${input.transcriptText}`)
  if (input.engagement && Object.keys(input.engagement).length > 0) {
    lines.push(`Engagement: ${JSON.stringify(input.engagement)}`)
  }

  return lines.join('\n\n').trim()
}

function getFeatureFlagContext(source: ContentSource): FeatureFlagContext {
  return {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    metadata: {
      source: 'content-pipeline-social-video',
      sourceId: source.id,
      projectId: source.project_id,
      platform: getSourcePlatform(source),
    },
  }
}

async function downloadVideo(url: string, tempDir: string): Promise<{ videoPath: string; mimeType: string }> {
  assertEgressAllowed(url)
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'video/mp4'
  const extension =
    VIDEO_EXTENSIONS.find((candidate) => url.toLowerCase().includes(candidate)) ??
    (contentType.includes('webm') ? '.webm' : '.mp4')
  const videoPath = path.join(tempDir, `source-video${extension}`)
  await writeFile(videoPath, buffer)

  return { videoPath, mimeType: contentType }
}

async function extractAudio(videoPath: string, tempDir: string): Promise<{ audioPath: string; audioBuffer: Buffer }> {
  const audioPath = path.join(tempDir, 'source-audio.mp3')
  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-b:a',
        '64k',
        audioPath,
      ],
      (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      }
    )
  })

  const audioBuffer = await readFile(audioPath)
  return { audioPath, audioBuffer }
}

async function transcribeVideoUrl(url: string, source: ContentSource): Promise<TranscriptionOutcome> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'foco-social-video-'))
  let downloaded = false

  try {
    const { videoPath } = await downloadVideo(url, tempDir)
    downloaded = true
    const { audioBuffer } = await extractAudio(videoPath, tempDir)
    const transcript = await transcribeAudio(
      {
        data: audioBuffer,
        filename: 'source-audio.mp3',
        mimeType: 'audio/mpeg',
        size: audioBuffer.byteLength,
      },
      getFeatureFlagContext(source),
      {
        responseFormat: 'verbose_json',
        temperature: 0,
      }
    )

    return {
      transcriptText: transcript.text?.trim() || undefined,
      downloadStatus: 'complete',
      transcriptStatus: transcript.text?.trim() ? 'complete' : 'failed',
      downloaded: true,
      warning: transcript.text?.trim() ? undefined : 'Transcription returned empty text',
    }
  } catch (error) {
    return {
      downloadStatus: downloaded ? 'complete' : 'failed',
      transcriptStatus: 'failed',
      downloaded,
      warning: error instanceof Error ? error.message : 'Video transcription failed',
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

function extractEngagement(item: Record<string, unknown>): Record<string, unknown> {
  const likes = firstNumber(item, ['likesCount', 'likes', 'likeCount', 'favoriteCount', 'favorites'])
  const comments = firstNumber(item, ['commentsCount', 'comments', 'commentCount', 'replyCount'])
  const views = firstNumber(item, ['videoViewCount', 'views', 'viewCount', 'playCount'])
  const shares = firstNumber(item, ['shareCount', 'shares', 'retweetCount', 'retweets'])

  const engagement: Record<string, unknown> = {}
  if (typeof likes === 'number') engagement.likes = likes
  if (typeof comments === 'number') engagement.comments = comments
  if (typeof views === 'number') engagement.views = views
  if (typeof shares === 'number') engagement.shares = shares
  return engagement
}

async function normalizeSocialItem(
  source: ContentSource,
  item: Record<string, unknown>,
  idx: number
): Promise<{ raw: RawContentItem; hasVideo: boolean; downloaded: boolean; transcribed: boolean; warning?: string }> {
  const platform = getSourcePlatform(source)
  const postUrl = firstString(item, ['postUrl', 'url', 'link', 'inputUrl'])
  const title = firstString(item, ['title', 'name', 'username', 'authorName']) ?? undefined
  const captionText = firstString(item, ['caption', 'text', 'fullText', 'full_text', 'description']) ?? undefined
  const authorName = firstString(item, ['ownerUsername', 'username', 'authorName', 'ownerFullName', 'author']) ?? undefined
  const publishedAt = normalizeIsoDate(
    firstString(item, ['timestamp', 'publishedAt', 'createdAt', 'takenAt', 'date']) ??
    firstNumber(item, ['timestamp'])
  )
  const thumbnailUrl = collectUrlsByHints(item, IMAGE_URL_HINTS)[0]
  const videoUrl = pickBestVideoUrl(item)
  const hasVideo = Boolean(videoUrl)
  let transcriptText = firstString(item, ['transcript', 'subtitle', 'subtitles', 'captions']) ?? undefined
  let downloadStatus: RawContentItem['download_status'] = hasVideo ? 'pending' : 'not_applicable'
  let transcriptStatus: RawContentItem['transcript_status'] = transcriptText ? 'complete' : hasVideo ? 'pending' : 'not_applicable'
  let downloaded = false
  let warning: string | undefined

  if (!transcriptText && hasVideo && platform && VIDEO_PLATFORMS.has(platform) && videoUrl) {
    const outcome = await transcribeVideoUrl(videoUrl, source)
    transcriptText = outcome.transcriptText
    downloadStatus = outcome.downloadStatus
    transcriptStatus = outcome.transcriptStatus
    downloaded = outcome.downloaded
    warning = outcome.warning
  }

  const mediaUrls = Array.from(new Set([videoUrl, ...collectUrlsByHints(item, [...VIDEO_URL_HINTS, ...IMAGE_URL_HINTS])].filter(Boolean) as string[]))
  const contentType = detectContentType(item, hasVideo)
  const engagement = extractEngagement(item)
  const externalId = buildExternalId(item, `${source.id}:${postUrl || idx}`)
  const analysisText = buildAnalysisText({
    title,
    captionText,
    transcriptText,
    authorName,
    publishedAt,
    platform,
    contentType,
    engagement,
  })

  return {
    raw: {
      external_id: externalId,
      title,
      content: analysisText || captionText || title || JSON.stringify(item),
      published_at: publishedAt,
      content_type: contentType,
      caption_text: captionText,
      transcript_text: transcriptText,
      analysis_text: analysisText || undefined,
      post_url: postUrl,
      video_url: videoUrl,
      media_urls: mediaUrls,
      thumbnail_url: thumbnailUrl,
      author_name: authorName,
      engagement,
      provider_payload: item,
      download_status: downloadStatus,
      transcript_status: transcriptStatus,
    },
    hasVideo,
    downloaded,
    transcribed: transcriptStatus === 'complete',
    warning,
  }
}

export async function prepareApifyItemsForSource(
  source: ContentSource,
  items: Record<string, unknown>[]
): Promise<PreparedSocialBatch> {
  const platform = getSourcePlatform(source)
  if (!platform) {
    return {
      items: items.map((item, idx) => ({
        external_id: buildExternalId(item, `${source.id}:${idx}`),
        title: firstString(item, ['title', 'name', 'username']) ?? 'Untitled',
        content: JSON.stringify(item),
        published_at: normalizeIsoDate(firstString(item, ['publishedAt', 'createdAt', 'date'])),
        provider_payload: item,
        download_status: 'not_applicable',
        transcript_status: 'not_applicable',
      })),
      videoItemsDetected: 0,
      videosDownloaded: 0,
      transcriptsCompleted: 0,
      transcriptsFailed: 0,
      warnings: [],
    }
  }

  const warnings: string[] = []
  const normalized = []
  let videoItemsDetected = 0
  let videosDownloaded = 0
  let transcriptsCompleted = 0
  let transcriptsFailed = 0

  for (let idx = 0; idx < items.length; idx++) {
    const normalizedItem = await normalizeSocialItem(source, items[idx], idx)
    normalized.push(normalizedItem.raw)

    if (normalizedItem.hasVideo) videoItemsDetected += 1
    if (normalizedItem.downloaded) videosDownloaded += 1
    if (normalizedItem.transcribed) transcriptsCompleted += 1
    if (normalizedItem.hasVideo && !normalizedItem.transcribed) transcriptsFailed += 1
    if (normalizedItem.warning) warnings.push(`${normalizedItem.raw.external_id}: ${normalizedItem.warning}`)
  }

  return {
    items: normalized,
    videoItemsDetected,
    videosDownloaded,
    transcriptsCompleted,
    transcriptsFailed,
    warnings,
  }
}
