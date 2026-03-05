const { chromium } = require('playwright');

const BASE_URL = 'http://127.0.0.1:4000';
const EMAIL = process.env.CRUD_SWEEP_EMAIL || '';
const PASSWORD = process.env.CRUD_SWEEP_PASSWORD || '';

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(res) {
  const status = res.status();
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status, text, json };
}

function unwrapData(json) {
  if (!json || typeof json !== 'object') return null;
  if (json.data && typeof json.data === 'object') return json.data;
  return json;
}

function bodySummary(parsed) {
  if (!parsed) return '';
  if (parsed.json && typeof parsed.json === 'object') {
    const err = parsed.json.error;
    if (typeof err === 'string') return err;
    if (err && typeof err.message === 'string') return err.message;
    if (typeof parsed.json.message === 'string') return parsed.json.message;
    if (typeof parsed.json.success === 'boolean') return `success=${parsed.json.success}`;
  }
  return parsed.text.slice(0, 180).replace(/\s+/g, ' ');
}

(async () => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Missing credentials. Set CRUD_SWEEP_EMAIL and CRUD_SWEEP_PASSWORD.');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  let cleanup = {
    projects: [],
    tasks: [],
    runs: [],
    crons: [],
    histories: [],
  };

  function addResult(scope, step, ok, details) {
    results.push({ scope, step, ok, details });
  }

  async function api(method, path, body) {
    const req = page.request;
    const res = await req.fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      data: body,
    });
    const parsed = await parseResponse(res);
    return { res, parsed };
  }

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('[data-testid="email-input"]');
    await page.keyboard.type(EMAIL, { delay: 20 });
    await page.click('[data-testid="password-input"]');
    await page.keyboard.type(PASSWORD, { delay: 20 });
    await page.waitForTimeout(200);
    await page.click('[data-testid="login-button"]');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(
      () => !window.location.pathname.startsWith('/login'),
      undefined,
      { timeout: 20000 }
    );

    const twoFaVisible = await page.locator('[data-testid="2fa-token-input"]').isVisible().catch(() => false);
    if (twoFaVisible) {
      addResult('auth', 'login', false, '2FA challenge required; automated run blocked without token');
      throw new Error('2FA required');
    }

    const url = page.url();
    if (/\/login(?:\?|$)/.test(url)) {
      const errorText = await page.locator('text=/invalid|error|incorrect|failed/i').first().textContent().catch(() => null);
      addResult('auth', 'login', false, `Stayed on login. ${errorText || 'No explicit UI error text found.'}`);
      throw new Error('Login failed');
    }

    addResult('auth', 'login', true, `Authenticated; landed on ${url}`);

    // Workspace probe
    {
      const { parsed } = await api('GET', '/api/user/workspace');
      const ok = parsed.status >= 200 && parsed.status < 300;
      const ws = unwrapData(parsed.json);
      addResult('workspace', 'read primary workspace', ok, `status=${parsed.status} ${ok ? `workspace_id=${ws?.workspace_id || ws?.id || 'n/a'}` : bodySummary(parsed)}`);
    }

    // PROJECT CRUD
    let projectId = null;
    {
      const projectName = `CRUD Sweep Project ${nowTag()}`;
      const { parsed } = await api('POST', '/api/projects', {
        name: projectName,
        description: 'Automated CRUD validation project',
      });
      const data = unwrapData(parsed.json);
      projectId = data?.id || null;
      const ok = parsed.status === 201 || parsed.status === 200;
      addResult('projects', 'create', ok && !!projectId, `status=${parsed.status} id=${projectId || 'n/a'} ${!ok ? bodySummary(parsed) : ''}`.trim());
      if (projectId) cleanup.projects.push(projectId);

      const list = await api('GET', '/api/projects?limit=200');
      const listData = unwrapData(list.parsed.json);
      const projects = listData?.projects || listData?.data?.projects || listData?.data || [];
      const found = Array.isArray(projects) ? projects.some((p) => p?.id === projectId) : false;
      addResult('projects', 'read list', list.parsed.status === 200 && found, `status=${list.parsed.status} found_created=${found}`);

      if (projectId) {
        const patch = await api('PATCH', `/api/projects/${projectId}`, {
          description: 'Updated by automated CRUD sweep',
        });
        addResult('projects', 'update', patch.parsed.status === 200, `status=${patch.parsed.status} ${patch.parsed.status !== 200 ? bodySummary(patch.parsed) : ''}`.trim());

        const getOne = await api('GET', `/api/projects/${projectId}`);
        const oneData = unwrapData(getOne.parsed.json);
        const desc = oneData?.description || oneData?.data?.description;
        addResult('projects', 'read one', getOne.parsed.status === 200 && typeof desc === 'string', `status=${getOne.parsed.status} description_present=${typeof desc === 'string'}`);
      }
    }

    // TASK CRUD
    let taskProjectId = null;
    let taskId = null;
    {
      const projectName = `CRUD Sweep Task Holder ${nowTag()}`;
      const createProject = await api('POST', '/api/projects', {
        name: projectName,
        description: 'Task CRUD holder project',
      });
      const pData = unwrapData(createProject.parsed.json);
      taskProjectId = pData?.id || null;
      if (taskProjectId) cleanup.projects.push(taskProjectId);

      addResult('tasks', 'setup project', (createProject.parsed.status === 201 || createProject.parsed.status === 200) && !!taskProjectId, `status=${createProject.parsed.status} project_id=${taskProjectId || 'n/a'} ${taskProjectId ? '' : bodySummary(createProject.parsed)}`.trim());

      if (taskProjectId) {
        const createTask = await api('POST', '/api/tasks', {
          title: `CRUD Sweep Task ${nowTag()}`,
          description: 'Automated CRUD task',
          project_id: taskProjectId,
          priority: 'high',
          status: 'backlog',
        });
        const tData = unwrapData(createTask.parsed.json);
        taskId = tData?.id || null;
        if (taskId) cleanup.tasks.push(taskId);

        addResult('tasks', 'create', (createTask.parsed.status === 201 || createTask.parsed.status === 200) && !!taskId, `status=${createTask.parsed.status} id=${taskId || 'n/a'} ${taskId ? '' : bodySummary(createTask.parsed)}`.trim());

        const list = await api('GET', `/api/tasks?project_id=${taskProjectId}&limit=50`);
        const listData = unwrapData(list.parsed.json);
        const rows = listData?.tasks || listData?.data?.tasks || listData?.data || [];
        const found = Array.isArray(rows) ? rows.some((t) => t?.id === taskId) : false;
        addResult('tasks', 'read list', list.parsed.status === 200 && found, `status=${list.parsed.status} found_created=${found}`);

        if (taskId) {
          const patch = await api('PATCH', `/api/tasks/${taskId}`, {
            status: 'in_progress',
            title: `CRUD Sweep Task Updated ${nowTag()}`,
          });
          addResult('tasks', 'update', patch.parsed.status === 200, `status=${patch.parsed.status} ${patch.parsed.status !== 200 ? bodySummary(patch.parsed) : ''}`.trim());

          const getOne = await api('GET', `/api/tasks/${taskId}`);
          const oneData = unwrapData(getOne.parsed.json);
          const status = oneData?.status || oneData?.data?.status;
          addResult('tasks', 'read one', getOne.parsed.status === 200 && !!status, `status=${getOne.parsed.status} task_status=${status || 'n/a'}`);

          const del = await api('DELETE', `/api/tasks/${taskId}`);
          const delOk = del.parsed.status === 200;
          addResult('tasks', 'delete', delOk, `status=${del.parsed.status} ${delOk ? '' : bodySummary(del.parsed)}`.trim());
          if (delOk) cleanup.tasks = cleanup.tasks.filter((id) => id !== taskId);

          const getAfter = await api('GET', `/api/tasks/${taskId}`);
          addResult('tasks', 'read after delete', getAfter.parsed.status === 404, `status=${getAfter.parsed.status}`);
        }
      }
    }

    // RUNS CRUD
    let runId = null;
    {
      const create = await api('POST', '/api/runs', {
        runner: 'command-surface',
        status: 'pending',
        summary: `CRUD sweep run ${nowTag()}`,
        project_id: taskProjectId,
      });
      const data = unwrapData(create.parsed.json);
      runId = data?.id || null;
      if (runId) cleanup.runs.push(runId);
      addResult('runs', 'create', (create.parsed.status === 201 || create.parsed.status === 200) && !!runId, `status=${create.parsed.status} id=${runId || 'n/a'} ${runId ? '' : bodySummary(create.parsed)}`.trim());

      const list = await api('GET', '/api/runs?limit=25');
      const rows = (list.parsed.json && Array.isArray(list.parsed.json.data)) ? list.parsed.json.data : [];
      const found = rows.some((r) => r?.id === runId);
      addResult('runs', 'read list', list.parsed.status === 200 && found, `status=${list.parsed.status} found_created=${found}`);

      if (runId) {
        const patch = await api('PATCH', `/api/runs/${runId}`, {
          status: 'cancelled',
          summary: 'CRUD sweep updated',
        });
        addResult('runs', 'update', patch.parsed.status === 200, `status=${patch.parsed.status} ${patch.parsed.status !== 200 ? bodySummary(patch.parsed) : ''}`.trim());

        const one = await api('GET', `/api/runs/${runId}`);
        const oneData = unwrapData(one.parsed.json);
        addResult('runs', 'read one', one.parsed.status === 200 && (oneData?.id === runId || oneData?.data?.id === runId), `status=${one.parsed.status}`);

        const del = await api('DELETE', `/api/runs/${runId}`);
        const delOk = del.parsed.status === 200;
        addResult('runs', 'delete', delOk, `status=${del.parsed.status} ${delOk ? '' : bodySummary(del.parsed)}`.trim());
        if (delOk) cleanup.runs = cleanup.runs.filter((id) => id !== runId);

        const after = await api('GET', `/api/runs/${runId}`);
        addResult('runs', 'read after delete', after.parsed.status === 404, `status=${after.parsed.status}`);
      }
    }

    // CRONS CRUD
    let cronId = null;
    {
      const create = await api('POST', '/api/crons', {
        name: `CRUD Sweep Cron ${nowTag()}`,
        schedule: '17 4 * * *',
        handler: 'jobs/daily-summary',
        description: 'Automated CRUD cron check',
        enabled: false,
      });
      const data = unwrapData(create.parsed.json);
      cronId = data?.id || null;
      if (cronId) cleanup.crons.push(cronId);
      const createdOk = (create.parsed.status === 201 || create.parsed.status === 200) && !!cronId;
      addResult('crons', 'create', createdOk, `status=${create.parsed.status} id=${cronId || 'n/a'} ${createdOk ? '' : bodySummary(create.parsed)}`.trim());

      const list = await api('GET', '/api/crons');
      const rows = (list.parsed.json && Array.isArray(list.parsed.json.data)) ? list.parsed.json.data : [];
      const found = cronId ? rows.some((c) => c?.id === cronId) : false;
      addResult('crons', 'read list', list.parsed.status === 200 && (cronId ? found : true), `status=${list.parsed.status} ${cronId ? `found_created=${found}` : 'create_failed_so_only_list_checked'}`);

      if (cronId) {
        const patch = await api('PATCH', `/api/crons/${cronId}`, {
          description: 'Updated by automated CRUD sweep',
          enabled: true,
        });
        addResult('crons', 'update', patch.parsed.status === 200, `status=${patch.parsed.status} ${patch.parsed.status !== 200 ? bodySummary(patch.parsed) : ''}`.trim());

        const one = await api('GET', `/api/crons/${cronId}`);
        const oneData = unwrapData(one.parsed.json);
        addResult('crons', 'read one', one.parsed.status === 200 && (oneData?.id === cronId || oneData?.data?.id === cronId), `status=${one.parsed.status}`);

        const del = await api('DELETE', `/api/crons/${cronId}`);
        const delOk = del.parsed.status === 200;
        addResult('crons', 'delete', delOk, `status=${del.parsed.status} ${delOk ? '' : bodySummary(del.parsed)}`.trim());
        if (delOk) cleanup.crons = cleanup.crons.filter((id) => id !== cronId);

        const after = await api('GET', `/api/crons/${cronId}`);
        addResult('crons', 'read after delete', after.parsed.status === 404, `status=${after.parsed.status}`);
      }
    }

    // COMMAND SURFACE HISTORY CRUD
    {
      const historyId = `crud-history-${nowTag()}`;
      const item = {
        id: historyId,
        prompt: 'CRUD sweep history item',
        mode: 'auto',
        intent: 'unknown',
        confidence: 0.5,
        status: 'completed',
        outputPreview: 'ok',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const create = await api('POST', '/api/command-surface/history', item);
      const createOk = create.parsed.status === 200;
      addResult('command_history', 'create', createOk, `status=${create.parsed.status} ${createOk ? '' : bodySummary(create.parsed)}`.trim());
      if (createOk) cleanup.histories.push(historyId);

      const list = await api('GET', '/api/command-surface/history?limit=50');
      const rows = list.parsed.json?.data;
      const found = Array.isArray(rows) ? rows.some((r) => r?.id === historyId) : false;
      addResult('command_history', 'read list', list.parsed.status === 200 && found, `status=${list.parsed.status} found_created=${found}`);

      const del = await api('DELETE', `/api/command-surface/history?history_id=${encodeURIComponent(historyId)}`);
      const delOk = del.parsed.status === 200;
      addResult('command_history', 'delete', delOk, `status=${del.parsed.status} ${delOk ? '' : bodySummary(del.parsed)}`.trim());
      if (delOk) cleanup.histories = cleanup.histories.filter((id) => id !== historyId);

      const after = await api('GET', '/api/command-surface/history?limit=50');
      const afterRows = after.parsed.json?.data;
      const stillThere = Array.isArray(afterRows) ? afterRows.some((r) => r?.id === historyId) : false;
      addResult('command_history', 'read after delete', after.parsed.status === 200 && !stillThere, `status=${after.parsed.status} still_present=${stillThere}`);
    }

  } catch (err) {
    addResult('fatal', 'execution', false, err instanceof Error ? err.message : String(err));
  } finally {
    // best-effort cleanup
    try {
      for (const id of cleanup.tasks) {
        try { await api('DELETE', `/api/tasks/${id}`); } catch {}
        await sleep(50);
      }
      for (const id of cleanup.runs) {
        try { await api('DELETE', `/api/runs/${id}`); } catch {}
        await sleep(50);
      }
      for (const id of cleanup.histories) {
        try { await api('DELETE', `/api/command-surface/history?history_id=${encodeURIComponent(id)}`); } catch {}
        await sleep(50);
      }
      for (const id of cleanup.crons) {
        try { await api('DELETE', `/api/crons/${id}`); } catch {}
        await sleep(50);
      }
      for (const id of cleanup.projects) {
        try { await api('DELETE', `/api/projects/${id}`); } catch {}
        await sleep(50);
      }
    } catch {}

    await context.close();
    await browser.close();

    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    console.log('\n=== AUTHENTICATED CRUD SWEEP RESULTS ===');
    for (const r of results) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.scope.padEnd(16)} | ${r.step.padEnd(20)} | ${r.details}`);
    }
    console.log('----------------------------------------');
    console.log(`TOTAL: ${results.length}  PASS: ${passed}  FAIL: ${failed}`);

    if (failed > 0) process.exitCode = 2;
  }
})();
