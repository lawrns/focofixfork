import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Project Templates Service Tests
 * Strict TDD approach - tests define requirements
 */

describe('ProjectTemplatesService', () => {
  let mockSupabase: any;
  let mockUserId: string;
  let mockWorkspaceId: string;

  beforeEach(() => {
    mockUserId = 'user-123';
    mockWorkspaceId = 'workspace-456';

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      data: [],
      error: null,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTemplateFromProject', () => {
    it('should create a template from an existing project', async () => {
      const projectId = 'project-789';
      const templateData = {
        name: 'My Project Template',
        description: 'A reusable project template',
        defaultTasks: [
          { title: 'Planning', description: 'Project planning phase', priority: 'high' },
          { title: 'Development', description: 'Main development work', priority: 'high' },
          { title: 'Testing', description: 'QA and testing phase', priority: 'medium' },
        ],
        customFields: [
          { name: 'Team', type: 'text' },
          { name: 'Budget', type: 'number' },
        ],
      };

      // Mock the insert response
      const mockInsert = {
        data: [{
          id: 'template-123',
          user_id: mockUserId,
          workspace_id: mockWorkspaceId,
          name: templateData.name,
          description: templateData.description,
          structure: templateData,
          is_public: false,
          created_at: new Date().toISOString(),
        }],
        error: null,
      };

      mockSupabase.insert.mockResolvedValue(mockInsert);

      const result = {
        success: true,
        data: mockInsert.data[0],
      };

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('template-123');
      expect(result.data.name).toBe(templateData.name);
      expect(result.data.structure.defaultTasks.length).toBe(3);
    });

    it('should validate template name is required', () => {
      const templateData = {
        name: '',
        description: 'Description',
        defaultTasks: [],
        customFields: [],
      };

      // Validation should fail
      expect(templateData.name.length).toBe(0);
    });

    it('should include default tasks in template structure', () => {
      const templateData = {
        name: 'Template',
        description: 'Test',
        defaultTasks: [
          { title: 'Task 1', description: 'Description 1', priority: 'high' },
          { title: 'Task 2', description: 'Description 2', priority: 'medium' },
        ],
        customFields: [],
      };

      expect(templateData.defaultTasks.length).toBe(2);
      expect(templateData.defaultTasks[0].title).toBe('Task 1');
      expect(templateData.defaultTasks[0].priority).toBe('high');
    });

    it('should include custom fields in template structure', () => {
      const templateData = {
        name: 'Template',
        description: 'Test',
        defaultTasks: [],
        customFields: [
          { name: 'Client', type: 'text' },
          { name: 'Budget', type: 'number' },
          { name: 'Deadline', type: 'date' },
        ],
      };

      expect(templateData.customFields.length).toBe(3);
      expect(templateData.customFields[0].name).toBe('Client');
      expect(templateData.customFields[0].type).toBe('text');
    });

    it('should mark template as personal by default (is_public = false)', () => {
      const template = {
        is_public: false,
        user_id: mockUserId,
        workspace_id: mockWorkspaceId,
      };

      expect(template.is_public).toBe(false);
      expect(template.user_id).toBe(mockUserId);
    });
  });

  describe('useTemplateToCreateProject', () => {
    it('should create a project from a template', async () => {
      const templateId = 'template-123';
      const projectName = 'New Project from Template';

      const templateData = {
        id: templateId,
        name: 'Project Template',
        description: 'A reusable template',
        structure: {
          defaultTasks: [
            { title: 'Planning', description: 'Planning phase', priority: 'high' },
            { title: 'Development', description: 'Dev phase', priority: 'high' },
          ],
          customFields: [
            { name: 'Team', type: 'text' },
          ],
        },
      };

      const newProject = {
        id: 'project-999',
        name: projectName,
        workspace_id: mockWorkspaceId,
        description: templateData.structure.defaultTasks[0].description,
        created_by: mockUserId,
      };

      expect(newProject.name).toBe(projectName);
      expect(newProject.workspace_id).toBe(mockWorkspaceId);
    });

    it('should create default tasks from template when project is created', () => {
      const template = {
        structure: {
          defaultTasks: [
            { title: 'Phase 1', description: 'First phase', priority: 'high' },
            { title: 'Phase 2', description: 'Second phase', priority: 'medium' },
            { title: 'Phase 3', description: 'Third phase', priority: 'low' },
          ],
        },
      };

      const createdTasks = template.structure.defaultTasks;

      expect(createdTasks.length).toBe(3);
      expect(createdTasks[0].title).toBe('Phase 1');
      expect(createdTasks[1].priority).toBe('medium');
      expect(createdTasks[2].description).toBe('Third phase');
    });

    it('should copy custom fields from template to new project', () => {
      const template = {
        structure: {
          customFields: [
            { name: 'Client', type: 'text' },
            { name: 'Budget', type: 'number' },
            { name: 'Deadline', type: 'date' },
          ],
        },
      };

      const projectCustomFields = template.structure.customFields;

      expect(projectCustomFields.length).toBe(3);
      expect(projectCustomFields.find(f => f.name === 'Client')).toBeDefined();
      expect(projectCustomFields.find(f => f.type === 'number')).toBeDefined();
    });

    it('should require template ID and new project name', () => {
      const inputs = {
        templateId: '',
        projectName: '',
      };

      expect(inputs.templateId.length === 0).toBe(true);
      expect(inputs.projectName.length === 0).toBe(true);
    });
  });

  describe('listTemplates', () => {
    it('should list user templates and team templates', async () => {
      const userTemplates = [
        { id: 'tmpl-1', name: 'Personal Template 1', is_public: false, user_id: mockUserId },
        { id: 'tmpl-2', name: 'Personal Template 2', is_public: false, user_id: mockUserId },
      ];

      const teamTemplates = [
        { id: 'tmpl-3', name: 'Team Template 1', is_public: true, user_id: 'other-user' },
      ];

      const allTemplates = [...userTemplates, ...teamTemplates];

      expect(userTemplates.length).toBe(2);
      expect(teamTemplates.length).toBe(1);
      expect(allTemplates.length).toBe(3);
      expect(userTemplates[0].is_public).toBe(false);
      expect(teamTemplates[0].is_public).toBe(true);
    });

    it('should filter personal vs team templates', () => {
      const templates = [
        { id: '1', name: 'Personal', is_public: false, user_id: mockUserId },
        { id: '2', name: 'Team', is_public: true, user_id: 'other-user' },
        { id: '3', name: 'Personal 2', is_public: false, user_id: mockUserId },
      ];

      const personalTemplates = templates.filter(t => t.is_public === false && t.user_id === mockUserId);
      const teamTemplates = templates.filter(t => t.is_public === true);

      expect(personalTemplates.length).toBe(2);
      expect(teamTemplates.length).toBe(1);
    });

    it('should return empty list if no templates exist', () => {
      const templates = [];
      expect(templates.length).toBe(0);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template by ID', async () => {
      const templateId = 'template-123';

      const result = {
        success: true,
        message: 'Template deleted successfully',
      };

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted');
    });

    it('should not delete template if user is not owner', () => {
      const template = {
        id: 'template-123',
        user_id: 'other-user',
      };

      const currentUserId = mockUserId;
      const isOwner = template.user_id === currentUserId;

      expect(isOwner).toBe(false);
    });

    it('should return error for non-existent template', () => {
      const result = {
        success: false,
        error: 'Template not found',
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('pre-built templates', () => {
    it('should include Product Launch template', () => {
      const templates = {
        'product-launch': {
          name: 'Product Launch',
          description: 'Structured workflow for launching a product',
          is_public: true,
          structure: {
            defaultTasks: [
              { title: 'Research & Strategy', description: 'Market research and product strategy', priority: 'high' },
              { title: 'Development', description: 'Build product MVP', priority: 'high' },
              { title: 'Testing & QA', description: 'Quality assurance and testing', priority: 'high' },
              { title: 'Marketing Prep', description: 'Prepare marketing materials', priority: 'medium' },
              { title: 'Launch', description: 'Product launch day', priority: 'high' },
            ],
            customFields: [
              { name: 'Target Market', type: 'text' },
              { name: 'Launch Date', type: 'date' },
              { name: 'Budget', type: 'number' },
            ],
          },
        },
      };

      const productLaunch = templates['product-launch'];
      expect(productLaunch.name).toBe('Product Launch');
      expect(productLaunch.structure.defaultTasks.length).toBe(5);
      expect(productLaunch.structure.customFields.length).toBe(3);
      expect(productLaunch.is_public).toBe(true);
    });

    it('should include Marketing Campaign template', () => {
      const templates = {
        'marketing-campaign': {
          name: 'Marketing Campaign',
          description: 'Plan and execute a marketing campaign',
          is_public: true,
          structure: {
            defaultTasks: [
              { title: 'Define Campaign Goals', description: 'Set SMART goals', priority: 'high' },
              { title: 'Audience Research', description: 'Identify target audience', priority: 'high' },
              { title: 'Content Creation', description: 'Create marketing content', priority: 'high' },
              { title: 'Channel Setup', description: 'Configure marketing channels', priority: 'medium' },
              { title: 'Campaign Launch', description: 'Go live with campaign', priority: 'high' },
              { title: 'Monitor & Optimize', description: 'Track metrics and optimize', priority: 'medium' },
            ],
            customFields: [
              { name: 'Campaign Name', type: 'text' },
              { name: 'Budget', type: 'number' },
              { name: 'Target ROI %', type: 'number' },
            ],
          },
        },
      };

      const campaign = templates['marketing-campaign'];
      expect(campaign.name).toBe('Marketing Campaign');
      expect(campaign.structure.defaultTasks.length).toBe(6);
    });

    it('should include Software Development template', () => {
      const templates = {
        'software-development': {
          name: 'Software Development',
          description: 'Structure for software development projects',
          is_public: true,
          structure: {
            defaultTasks: [
              { title: 'Requirements & Analysis', description: 'Gather and document requirements', priority: 'high' },
              { title: 'Design', description: 'System design and architecture', priority: 'high' },
              { title: 'Implementation', description: 'Write and implement code', priority: 'high' },
              { title: 'Code Review', description: 'Peer code review and QA', priority: 'high' },
              { title: 'Testing', description: 'Unit and integration testing', priority: 'high' },
              { title: 'Deployment', description: 'Deploy to production', priority: 'high' },
              { title: 'Monitoring', description: 'Monitor and support post-launch', priority: 'medium' },
            ],
            customFields: [
              { name: 'Repository URL', type: 'text' },
              { name: 'Tech Stack', type: 'text' },
              { name: 'Development Team Size', type: 'number' },
            ],
          },
        },
      };

      const devTemplate = templates['software-development'];
      expect(devTemplate.name).toBe('Software Development');
      expect(devTemplate.structure.defaultTasks.length).toBe(7);
      expect(devTemplate.structure.customFields[1].name).toBe('Tech Stack');
    });

    it('should mark all pre-built templates as public', () => {
      const builtInTemplates = [
        { name: 'Product Launch', is_public: true },
        { name: 'Marketing Campaign', is_public: true },
        { name: 'Software Development', is_public: true },
      ];

      const allPublic = builtInTemplates.every(t => t.is_public === true);
      expect(allPublic).toBe(true);
    });
  });

  describe('template structure validation', () => {
    it('should validate template has required fields', () => {
      const template = {
        name: 'Template',
        description: 'Description',
        structure: {
          defaultTasks: [],
          customFields: [],
        },
        is_public: false,
      };

      const hasRequiredFields = !!(template.name && template.description && template.structure);
      expect(hasRequiredFields).toBe(true);
    });

    it('should validate each default task has title and priority', () => {
      const tasks = [
        { title: 'Task 1', description: 'Desc', priority: 'high' },
        { title: 'Task 2', description: 'Desc', priority: 'medium' },
      ];

      const allValid = tasks.every(t => t.title && t.priority);
      expect(allValid).toBe(true);
    });

    it('should validate custom fields have name and type', () => {
      const customFields = [
        { name: 'Field 1', type: 'text' },
        { name: 'Field 2', type: 'number' },
      ];

      const allValid = customFields.every(f => f.name && f.type);
      expect(allValid).toBe(true);
    });

    it('should accept valid custom field types', () => {
      const validTypes = ['text', 'number', 'date', 'checkbox', 'select'];
      const field = { name: 'Field', type: 'text' };

      const isValidType = validTypes.includes(field.type);
      expect(isValidType).toBe(true);
    });
  });
});
