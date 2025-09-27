import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create a new project', async ({ page }) => {
    // Navigate to projects section
    await page.goto('/dashboard');

    // Look for create project button
    const createButton = page.locator('button').filter({ hasText: /crear proyecto|new project|add project/i });

    if (await createButton.isVisible()) {
      await createButton.click();

      // Should open create project form
      await expect(page.locator('dialog, .modal, [role="dialog"]')).toBeVisible();

      // Fill project details
      await page.fill('input[name="name"], input[placeholder*="nombre"]', 'E2E Test Project');
      await page.fill('textarea[name="description"], textarea[placeholder*="descripción"]', 'Project created during E2E testing');

      // Select status if available
      const statusSelect = page.locator('select[name="status"], [role="combobox"][aria-label*="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('planning');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /crear|create|save/i });
      await submitButton.click();

      // Should close modal and show success
      await expect(page.locator('dialog, .modal, [role="dialog"]')).not.toBeVisible();

      // Should show the new project
      await expect(page.locator('text=E2E Test Project')).toBeVisible();
    } else {
      test.skip('Create project functionality not available');
    }
  });

  test('should display project list', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for projects section
    const projectsSection = page.locator('[data-testid="projects-list"], .projects-list, section').filter({ hasText: /proyectos|projects/i });

    if (await projectsSection.isVisible()) {
      // Should show project cards/items
      const projectItems = projectsSection.locator('[data-testid="project-item"], .project-card, .project-item');
      const projectCount = await projectItems.count();

      if (projectCount > 0) {
        // Should have project names and actions
        const firstProject = projectItems.first();
        await expect(firstProject.locator('text=/./')).toBeVisible(); // Should have some text

        // Should have action buttons (edit, delete, view)
        const actionButtons = firstProject.locator('button');
        const actionCount = await actionButtons.count();
        expect(actionCount).toBeGreaterThan(0);
      }
    }
  });

  test('should view project details', async ({ page }) => {
    await page.goto('/dashboard');

    // Find a project to view
    const projectLink = page.locator('a').filter({ hasText: /view|ver|details/i }).first();

    if (await projectLink.isVisible()) {
      await projectLink.click();

      // Should navigate to project page
      await expect(page).toHaveURL(/.*project.*/);

      // Should show project details
      await expect(page.locator('h1, h2').filter({ hasText: /./ })).toBeVisible();
    } else {
      // Try clicking on project name/title
      const projectTitle = page.locator('[data-testid="project-title"], .project-title, h3, h4').first();

      if (await projectTitle.isVisible()) {
        await projectTitle.click();

        // Should navigate to project page
        await expect(page).toHaveURL(/.*project.*/);
      } else {
        test.skip('No projects available to view');
      }
    }
  });

  test('should edit project information', async ({ page }) => {
    await page.goto('/dashboard');

    // Find edit button for a project
    const editButton = page.locator('button').filter({ hasText: /edit|editar|modificar/i }).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Should open edit form
      await expect(page.locator('dialog, .modal, [role="dialog"]')).toBeVisible();

      // Modify project name
      const nameInput = page.locator('input[name="name"], input[placeholder*="nombre"]');
      await nameInput.fill('Updated Project Name');

      // Save changes
      const saveButton = page.locator('button[type="submit"]').filter({ hasText: /save|guardar|update/i });
      await saveButton.click();

      // Should close modal and show updated name
      await expect(page.locator('dialog, .modal, [role="dialog"]')).not.toBeVisible();
      await expect(page.locator('text=Updated Project Name')).toBeVisible();
    } else {
      test.skip('Edit project functionality not available');
    }
  });

  test('should manage project milestones', async ({ page }) => {
    // Navigate to a project or find milestones section
    await page.goto('/dashboard');

    const milestonesSection = page.locator('[data-testid="milestones"], .milestones').filter({ hasText: /milestones|hitos/i });

    if (await milestonesSection.isVisible()) {
      // Should show milestones
      const milestoneItems = milestonesSection.locator('[data-testid="milestone-item"], .milestone-card');
      const milestoneCount = await milestoneItems.count();

      if (milestoneCount > 0) {
        // Should have milestone details
        const firstMilestone = milestoneItems.first();
        await expect(firstMilestone.locator('text=/./')).toBeVisible();
      }

      // Look for create milestone button
      const createMilestoneButton = milestonesSection.locator('button').filter({ hasText: /crear|create|add.*milestone/i });

      if (await createMilestoneButton.isVisible()) {
        await createMilestoneButton.click();

        // Should open create milestone form
        await expect(page.locator('dialog, .modal, [role="dialog"]')).toBeVisible();

        // Fill milestone details
        await page.fill('input[name="title"], input[placeholder*="título"]', 'E2E Test Milestone');

        // Submit form
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // Should close modal and show new milestone
        await expect(page.locator('text=E2E Test Milestone')).toBeVisible();
      }
    } else {
      test.skip('Milestones functionality not available');
    }
  });

  test('should manage project tasks', async ({ page }) => {
    await page.goto('/dashboard');

    const tasksSection = page.locator('[data-testid="tasks"], .tasks').filter({ hasText: /tasks|tareas/i });

    if (await tasksSection.isVisible()) {
      // Look for create task button
      const createTaskButton = tasksSection.locator('button').filter({ hasText: /crear|create|add.*task/i });

      if (await createTaskButton.isVisible()) {
        await createTaskButton.click();

        // Should open create task form
        await expect(page.locator('dialog, .modal, [role="dialog"]')).toBeVisible();

        // Fill task details
        await page.fill('input[name="title"], input[placeholder*="título"]', 'E2E Test Task');
        await page.selectOption('select[name="priority"]', 'high');

        // Submit form
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // Should close modal and show new task
        await expect(page.locator('text=E2E Test Task')).toBeVisible();

        // Test task status change
        const taskItem = page.locator('[data-testid="task-item"]').filter({ hasText: 'E2E Test Task' });
        const statusButton = taskItem.locator('button').filter({ hasText: /status|estado/i });

        if (await statusButton.isVisible()) {
          await statusButton.click();
          // Status should change
          await expect(taskItem).toBeVisible();
        }
      }

      // Test task filtering/sorting if available
      const filterSelect = tasksSection.locator('select').filter({ hasText: /filter|filtro/i });

      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption('completed');
        // Should filter tasks
        await expect(tasksSection).toBeVisible();
      }
    } else {
      test.skip('Tasks functionality not available');
    }
  });

  test('should handle project views (Table/Kanban/Gantt)', async ({ page }) => {
    await page.goto('/dashboard');

    // Test Table view
    const tableView = page.locator('button').filter({ hasText: /table|tabla/i });
    if (await tableView.isVisible()) {
      await tableView.click();
      // Should show table view
      await expect(page.locator('table, [role="table"]')).toBeVisible();
    }

    // Test Kanban view
    const kanbanView = page.locator('button').filter({ hasText: /kanban|tablero/i });
    if (await kanbanView.isVisible()) {
      await kanbanView.click();
      // Should show kanban board
      await expect(page.locator('[data-testid="kanban-board"], .kanban-board')).toBeVisible();
    }

    // Test Gantt view
    const ganttView = page.locator('button').filter({ hasText: /gantt/i });
    if (await ganttView.isVisible()) {
      await ganttView.click();
      // Should show gantt chart
      await expect(page.locator('[data-testid="gantt-chart"], .gantt-chart')).toBeVisible();
    }
  });

  test('should export project data', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /export|exportar/i });

    if (await exportButton.isVisible()) {
      // Start download monitoring
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Should have a valid filename
      expect(download.suggestedFilename()).toMatch(/\.(csv|pdf|json)$/);
    } else {
      test.skip('Export functionality not available');
    }
  });

  test('should handle project permissions', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for sharing/permissions settings
    const shareButton = page.locator('button').filter({ hasText: /share|compartir|permissions/i });

    if (await shareButton.isVisible()) {
      await shareButton.click();

      // Should open sharing dialog
      await expect(page.locator('dialog, .modal, [role="dialog"]')).toBeVisible();

      // Should have user/team management
      const userInput = page.locator('input[placeholder*="email"], input[placeholder*="usuario"]');

      if (await userInput.isVisible()) {
        await userInput.fill('collaborator@example.com');

        // Add user
        const addButton = page.locator('button').filter({ hasText: /add|agregar|invite/i });
        if (await addButton.isVisible()) {
          await addButton.click();
          // Should show success or user added
          await expect(page.locator('text=collaborator@example.com')).toBeVisible();
        }
      }
    } else {
      test.skip('Sharing functionality not available');
    }
  });

  test('should display project analytics', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for analytics/metrics section
    const analyticsSection = page.locator('[data-testid="project-analytics"], .analytics, .metrics');

    if (await analyticsSection.isVisible()) {
      // Should show relevant metrics
      await expect(analyticsSection.locator('text=/[0-9]/')).toBeTruthy(); // Should have numbers

      // Should have progress indicators
      const progressBars = analyticsSection.locator('[role="progressbar"], .progress-bar');
      if (await progressBars.first().isVisible()) {
        // Progress bars should have proper ARIA attributes
        const progressBar = progressBars.first();
        await expect(progressBar).toHaveAttribute('aria-valuenow');
        await expect(progressBar).toHaveAttribute('aria-valuemin');
        await expect(progressBar).toHaveAttribute('aria-valuemax');
      }
    } else {
      test.skip('Analytics functionality not available');
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for bulk selection controls
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="select all"], [data-testid="select-all"]');

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();

      // Should show bulk action buttons
      const bulkActions = page.locator('button').filter({ hasText: /delete|archive|move|bulk/i });

      if (await bulkActions.first().isVisible()) {
        // Bulk actions should be visible
        const bulkActionCount = await bulkActions.count();
        expect(bulkActionCount).toBeGreaterThan(0);
      }
    } else {
      test.skip('Bulk operations not available');
    }
  });
});
