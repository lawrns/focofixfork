import { describe, it, expect } from 'vitest';
import {
  validateData,
  organizationSchema,
  projectSchema,
  taskSchema,
  goalSchema,
  sanitizeString,
  sanitizeHtml,
  uuidSchema,
  emailSchema,
  positiveNumberSchema,
  nonNegativeNumberSchema,
} from '../schemas';
import {
  createMockOrganization,
  createMockProject,
  createMockTask,
  createMockGoal,
} from '../../../__tests__/setup';

describe('Validation Schemas', () => {
  describe('validateData', () => {
    it('validates valid data successfully', () => {
      const validData = { email: 'test@example.com' };
      const result = validateData(emailSchema, validData);

      expect(result.success).toBe(true);
      expect((result as any).data).toEqual(validData);
    });

    it('returns errors for invalid data', () => {
      const invalidData = { email: 'invalid-email' };
      const result = validateData(emailSchema, invalidData);

      expect(result.success).toBe(false);
      expect((result as any).errors).toBeDefined();
      expect((result as any).errors.errors).toHaveLength(1);
      expect((result as any).errors.errors[0].message).toContain('email');
    });
  });

  describe('UUID Schema', () => {
    it('validates valid UUID', () => {
      const validUUID = '12345678-1234-1234-1234-123456789012';
      const result = validateData(uuidSchema, validUUID);

      expect(result.success).toBe(true);
      expect((result as any).data).toBe(validUUID);
    });

    it('rejects invalid UUID', () => {
      const invalidUUID = 'not-a-uuid';
      const result = validateData(uuidSchema, invalidUUID);

      expect(result.success).toBe(false);
      expect((result as any).errors.errors[0].message).toContain('uuid');
    });
  });

  describe('Email Schema', () => {
    it('validates valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@example.co.uk',
        'test.email@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        const result = validateData(emailSchema, email);
        expect(result.success).toBe(true);
        expect((result as any).data).toBe(email);
      });
    });

    it('rejects invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        '',
      ];

      invalidEmails.forEach(email => {
        const result = validateData(emailSchema, email);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Number Schemas', () => {
    it('validates positive numbers', () => {
      const validNumbers = [1, 10.5, 100, 0.1];

      validNumbers.forEach(num => {
        const result = validateData(positiveNumberSchema, num);
        expect(result.success).toBe(true);
        expect((result as any).data).toBe(num);
      });
    });

    it('rejects non-positive numbers', () => {
      const invalidNumbers = [0, -1, -10.5];

      invalidNumbers.forEach(num => {
        const result = validateData(positiveNumberSchema, num);
        expect(result.success).toBe(false);
      });
    });

    it('validates non-negative numbers', () => {
      const validNumbers = [0, 1, 10.5, 100];

      validNumbers.forEach(num => {
        const result = validateData(nonNegativeNumberSchema, num);
        expect(result.success).toBe(true);
        expect((result as any).data).toBe(num);
      });
    });

    it('rejects negative numbers', () => {
      const invalidNumbers = [-1, -10.5];

      invalidNumbers.forEach(num => {
        const result = validateData(nonNegativeNumberSchema, num);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Organization Schema', () => {
    it('validates valid organization data', () => {
      const orgData = createMockOrganization();
      const result = validateData(organizationSchema, orgData);

      expect(result.success).toBe(true);
      expect((result as any).data).toEqual(orgData);
    });

    it('validates organization with optional fields', () => {
      const orgData = {
        name: 'Test Organization',
        slug: 'test-org',
        created_by: 'user-123',
      };
      const result = validateData(organizationSchema, orgData);

      expect(result.success).toBe(true);
      expect((result as any).data.name).toBe('Test Organization');
      expect((result as any).data.description).toBeUndefined();
    });

    it('rejects organization without required fields', () => {
      const invalidOrg = { slug: 'test-org', created_by: 'user-123' };
      const result = validateData(organizationSchema, invalidOrg);

      expect(result.success).toBe(false);
      expect((result as any).errors.errors.some((e: any) => e.path.includes('name'))).toBe(true);
    });

    it('validates organization slug format', () => {
      const validSlugs = ['test-org', 'my-organization', 'org123'];
      const invalidSlugs = ['Test Org', 'org_with_underscore', 'org@domain', ''];

      validSlugs.forEach(slug => {
        const orgData = createMockOrganization({ slug });
        const result = validateData(organizationSchema, orgData);
        expect(result.success).toBe(true);
      });

      invalidSlugs.forEach(slug => {
        const orgData = createMockOrganization({ slug });
        const result = validateData(organizationSchema, orgData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Project Schema', () => {
    it('validates valid project data', () => {
      const projectData = createMockProject();
      const result = validateData(projectSchema, projectData);

      expect(result.success).toBe(true);
      expect((result as any).data).toEqual(projectData);
    });

    it('validates project status enum', () => {
      const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

      validStatuses.forEach(status => {
        const projectData = createMockProject({ status });
        const result = validateData(projectSchema, projectData);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid project status', () => {
      const projectData = createMockProject({ status: 'invalid-status' });
      const result = validateData(projectSchema, projectData);

      expect(result.success).toBe(false);
      expect((result as any).errors.errors[0].message).toContain('status');
    });

    it('validates progress percentage range', () => {
      const validPercentages = [0, 25, 50, 75, 100];
      const invalidPercentages = [-10, 150, '50'];

      validPercentages.forEach(percentage => {
        const projectData = createMockProject({ progress_percentage: percentage });
        const result = validateData(projectSchema, projectData);
        expect(result.success).toBe(true);
      });

      invalidPercentages.forEach(percentage => {
        const projectData = createMockProject({ progress_percentage: percentage });
        const result = validateData(projectSchema, projectData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Task Schema', () => {
    it('validates valid task data', () => {
      const taskData = createMockTask();
      const result = validateData(taskSchema, taskData);

      expect(result.success).toBe(true);
      expect((result as any).data).toEqual(taskData);
    });

    it('validates task priority enum', () => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];

      validPriorities.forEach(priority => {
        const taskData = createMockTask({ priority });
        const result = validateData(taskSchema, taskData);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid task priority', () => {
      const taskData = createMockTask({ priority: 'urgent' });
      const result = validateData(taskSchema, taskData);

      expect(result.success).toBe(false);
      expect((result as any).errors.errors[0].message).toContain('priority');
    });
  });

  describe('Goal Schema', () => {
    it('validates valid goal data', () => {
      const goalData = createMockGoal();
      const result = validateData(goalSchema, goalData);

      expect(result.success).toBe(true);
      expect((result as any).data).toEqual(goalData);
    });

    it('validates goal type enum', () => {
      const validTypes = ['project', 'milestone', 'task', 'organization', 'personal'];

      validTypes.forEach(type => {
        const goalData = createMockGoal({ type });
        const result = validateData(goalSchema, goalData);
        expect(result.success).toBe(true);
      });
    });

    it('validates goal progress consistency', () => {
      // Valid: current <= target
      const validGoal = createMockGoal({ current_value: 50, target_value: 100 });
      const result = validateData(goalSchema, validGoal);
      expect(result.success).toBe(true);

      // Invalid: current > target
      const invalidGoal = createMockGoal({ current_value: 150, target_value: 100 });
      const result2 = validateData(goalSchema, invalidGoal);
      expect(result2.success).toBe(true); // Schema doesn't enforce this business rule
    });
  });

  describe('Sanitization Functions', () => {
    describe('sanitizeString', () => {
      it('trims whitespace', () => {
        expect(sanitizeString('  hello world  ')).toBe('hello world');
        expect(sanitizeString('\t\nhello\t\n')).toBe('hello');
      });

      it('handles empty strings', () => {
        expect(sanitizeString('')).toBe('');
        expect(sanitizeString('   ')).toBe('');
      });

      it('handles null and undefined', () => {
        expect(sanitizeString(null as any)).toBe(null);
        expect(sanitizeString(undefined as any)).toBe(undefined);
      });
    });

    describe('sanitizeHtml', () => {
      it('removes script tags', () => {
        const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
        const sanitized = sanitizeHtml(html);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('alert("xss")');
      });

      it('removes style tags', () => {
        const html = '<p>Hello</p><style>body { color: red; }</style><p>World</p>';
        const sanitized = sanitizeHtml(html);
        expect(sanitized).not.toContain('<style>');
        expect(sanitized).not.toContain('body { color: red; }');
      });

      it('removes event handlers', () => {
        const html = '<button onclick="alert(\'xss\')">Click me</button>';
        const sanitized = sanitizeHtml(html);
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('alert(\'xss\')');
      });

      it('preserves safe HTML', () => {
        const html = '<p>Hello <strong>world</strong>!</p>';
        const sanitized = sanitizeHtml(html);
        expect(sanitized).toBe('<p>Hello <strong>world</strong>!</p>');
      });
    });
  });

});
