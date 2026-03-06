import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4000'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || ''
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const FIXTURE_SOURCE_NAME = 'E2E Hive Fixture Source'
const FIXTURE_SOURCE_URL = 'https://x.com/foco_e2e_fixture'
const FIXTURE_SUCCESS_EXTERNAL_ID = 'e2e-hive-success'
const FIXTURE_FAILURE_EXTERNAL_ID = 'e2e-hive-failure'

async function dismissProductTour(page: Page): Promise<void> {
  const skipButton = page.locator('button:has-text("Skip Tour"), button:has-text("Skip"), [aria-label*="close" i], button[aria-label*="dismiss" i]')
  const visible = await skipButton.first().isVisible({ timeout: 2000 }).catch(() => false)
  if (visible) {
    await skipButton.first().click()
  }
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', TEST_USER_EMAIL)
  await page.fill('input[type="password"]', TEST_USER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 20000 })
  await dismissProductTour(page)
}

async function seedHiveFixture() {
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required E2E auth or Supabase environment variables')
  }

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const authResult = await anon.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })

  if (authResult.error || !authResult.data.user) {
    throw new Error(`Unable to authenticate E2E fixture user: ${authResult.error?.message || 'unknown'}`)
  }

  const userId = authResult.data.user.id

  const { data: memberships, error: membershipError } = await admin
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)

  if (membershipError || !memberships?.[0]?.workspace_id) {
    throw new Error(`Unable to resolve workspace for E2E fixture user: ${membershipError?.message || 'missing membership'}`)
  }

  const workspaceId = memberships[0].workspace_id

  const { data: project, error: projectError } = await admin
    .from('foco_projects')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (projectError || !project?.id) {
    throw new Error(`Unable to resolve project for E2E fixture user: ${projectError?.message || 'missing project'}`)
  }

  const projectId = project.id

  const { data: existingSource, error: sourceLookupError } = await admin
    .from('content_sources')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', FIXTURE_SOURCE_NAME)
    .maybeSingle()

  if (sourceLookupError) {
    throw new Error(`Unable to lookup Hive fixture source: ${sourceLookupError.message}`)
  }

  let sourceId = existingSource?.id as string | undefined

  if (!sourceId) {
    const { data: createdSource, error: createSourceError } = await admin
      .from('content_sources')
      .insert({
        project_id: projectId,
        name: FIXTURE_SOURCE_NAME,
        url: FIXTURE_SOURCE_URL,
        type: 'apify',
        poll_interval_minutes: 120,
        status: 'active',
        headers: {
          __foco_platform: 'twitter',
          __foco_provider_config: { actor_id: 'fixture/actor' },
        },
      })
      .select('id')
      .single()

    if (createSourceError || !createdSource?.id) {
      throw new Error(`Unable to create Hive fixture source: ${createSourceError?.message || 'unknown'}`)
    }

    sourceId = createdSource.id
  }

  const now = new Date().toISOString()

  await admin
    .from('apify_runs')
    .delete()
    .eq('source_id', sourceId)

  const { error: runError } = await admin
    .from('apify_runs')
    .insert({
      source_id: sourceId,
      external_run_id: `e2e-hive-run-${Date.now()}`,
      dataset_id: 'e2e-hive-dataset',
      status: 'succeeded',
      metrics: {
        items_processed: 2,
        items_new: 2,
        video_items_detected: 1,
        videos_downloaded: 1,
        transcripts_completed: 1,
        transcripts_failed: 1,
      },
      started_at: now,
      completed_at: now,
    })

  if (runError) {
    throw new Error(`Unable to create Hive fixture run: ${runError.message}`)
  }

  await admin
    .from('content_items')
    .delete()
    .eq('source_id', sourceId)
    .in('external_id', [FIXTURE_SUCCESS_EXTERNAL_ID, FIXTURE_FAILURE_EXTERNAL_ID])

  const { error: itemsError } = await admin
    .from('content_items')
    .insert([
      {
        source_id: sourceId,
        external_id: FIXTURE_SUCCESS_EXTERNAL_ID,
        title: 'Operators keep asking for transcript-backed product intelligence',
        raw_content: 'Teams want transcript-backed upgrade intelligence from short-form video.',
        content_type: 'video',
        caption_text: 'Video captions mention workflow friction and missing intelligence loops.',
        transcript_text: 'Customers describe workflow friction, missed signals, and the need for faster upgrade loops.',
        analysis_text: 'Platform: twitter\n\nTranscript: Customers describe workflow friction, missed signals, and the need for faster upgrade loops.',
        post_url: 'https://x.com/foco_e2e_fixture/status/1',
        video_url: 'https://cdn.example.com/e2e-hive-video.mp4',
        media_urls: ['https://cdn.example.com/e2e-hive-video.mp4'],
        author_name: 'fixture-author',
        engagement: { likes: 42, comments: 7, views: 4200 },
        provider_payload: { fixture: true },
        download_status: 'complete',
        transcript_status: 'complete',
        analysis_status: 'complete',
        signal_type: 'workflow-friction',
        signal_confidence: 0.92,
        signal_urgency: 'urgent',
        upgrade_implication: 'Route transcript-backed social evidence into Hive clusters so operators can prioritize upgrades quickly.',
        evidence_excerpt: 'Customers describe workflow friction, missed signals, and the need for faster upgrade loops.',
        signal_payload: {
          summary: 'Multiple operators are explicitly asking for transcript-backed upgrade intelligence from social video.',
          signal_type: 'workflow-friction',
          confidence: 0.92,
          urgency: 'urgent',
          affected_area: 'social intelligence',
          upgrade_implication: 'Route transcript-backed social evidence into Hive clusters so operators can prioritize upgrades quickly.',
          evidence_excerpt: 'Customers describe workflow friction, missed signals, and the need for faster upgrade loops.',
          themes: ['upgrade-intelligence', 'workflow-friction'],
          tags: ['upgrade-intelligence', 'transcripts', 'workflow-friction'],
        },
        ai_summary: 'Multiple operators are explicitly asking for transcript-backed upgrade intelligence from social video.',
        ai_tags: ['upgrade-intelligence', 'transcripts', 'workflow-friction'],
        relevance_score: 0.94,
        published_at: now,
        analyzed_at: now,
        status: 'unread',
        created_at: now,
      },
      {
        source_id: sourceId,
        external_id: FIXTURE_FAILURE_EXTERNAL_ID,
        title: 'Fixture item with failed transcript',
        raw_content: 'A second item exists to verify unresolved failures rendering.',
        content_type: 'video',
        post_url: 'https://x.com/foco_e2e_fixture/status/2',
        video_url: 'https://cdn.example.com/e2e-hive-video-failed.mp4',
        media_urls: ['https://cdn.example.com/e2e-hive-video-failed.mp4'],
        engagement: {},
        provider_payload: { fixture: true, failed: true },
        download_status: 'failed',
        transcript_status: 'failed',
        analysis_status: 'failed',
        analysis_error: 'Fixture transcript download failed',
        signal_payload: {},
        status: 'unread',
        created_at: now,
      },
    ])

  if (itemsError) {
    throw new Error(`Unable to create Hive fixture items: ${itemsError.message}`)
  }
}

test.describe('Hive authenticated E2E', () => {
  test.beforeAll(async () => {
    await seedHiveFixture()
  })

  test('renders authenticated Hive channels, feed, and insights from live fixture data', async ({ page }) => {
    test.setTimeout(120000)

    await login(page)

    await page.goto(`${BASE_URL}/empire/hive`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Social Intelligence')).toBeVisible()
    await expect(page.getByText('Derive upgrade intelligence from social channels')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('📷')
    await expect(page.locator('body')).not.toContainText('📡')

    await expect(page.getByText(FIXTURE_SOURCE_NAME)).toBeVisible()
    await expect(page.getByText('1 transcribed')).toBeVisible()
    await expect(page.getByText('1 failed')).toBeVisible()

    await page.getByRole('tab', { name: 'Feed' }).click()
    await expect(page.getByText('Operators keep asking for transcript-backed product intelligence')).toBeVisible()
    await expect(page.getByText('Transcript ready')).toBeVisible()
    await expect(page.getByText('Signal ready')).toBeVisible()
    await expect(page.getByText('Upgrade implication')).toBeVisible()
    await expect(page.getByText('Route transcript-backed social evidence into Hive clusters so operators can prioritize upgrades quickly.')).toBeVisible()
    await expect(page.getByText('Customers describe workflow friction, missed signals, and the need for faster upgrade loops.').first()).toBeVisible()

    await page.getByRole('tab', { name: 'Insights' }).click()
    await expect(page.getByText('Upgrade Clusters')).toBeVisible()
    await expect(page.getByText('workflow-friction').first()).toBeVisible()
    await expect(page.getByText('Unresolved Failures')).toBeVisible()
    await expect(page.getByText('Fixture item with failed transcript')).toBeVisible()

    const insightsResponse = await page.request.get(`${BASE_URL}/api/content-pipeline/social/insights`)
    expect(insightsResponse.ok()).toBe(true)
    const insightsJson = await insightsResponse.json()
    expect(insightsJson.data.grouped_signals.length).toBeGreaterThan(0)
    expect(insightsJson.data.transcript_coverage.completed).toBeGreaterThan(0)
  })
})
