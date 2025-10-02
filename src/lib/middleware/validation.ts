import { NextRequest, NextResponse } from 'next/server';
import {
  validateData,
  organizationSchema,
  projectSchema,
  milestoneSchema,
  taskSchema,
  goalSchema,
  timeEntrySchema,
  commentSchema,
  invitationSchema,
  sanitizeString,
  sanitizeHtml
} from '@/lib/validation/schemas';

// Validation middleware for API requests
export function validateRequest<T>(
  schema: any,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validation = validateData(schema, data);
    if (validation.success) {
      return { success: true, data: validation.data as T };
    } else {
      const errors = (validation as any).errors.errors.map((err: any) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Validation failed due to unexpected error']
    };
  }
}

// Sanitize request data
export function sanitizeRequestData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (key === 'content' || key === 'description' || key === 'comment') {
        // Sanitize HTML content
        sanitized[key] = sanitizeHtml(String(value));
      } else if (key === 'name' || key === 'title' || key === 'full_name') {
        // Sanitize text fields
        sanitized[key] = sanitizeString(String(value));
      } else if (typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeRequestData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  return data;
}

// API endpoint validation helpers
export const validateOrganization = (data: unknown) => validateRequest(organizationSchema, data);
export const validateProject = (data: unknown) => validateRequest(projectSchema, data);
export const validateMilestone = (data: unknown) => validateRequest(milestoneSchema, data);
export const validateTask = (data: unknown) => validateRequest(taskSchema, data);
export const validateGoal = (data: unknown) => validateRequest(goalSchema, data);
export const validateTimeEntry = (data: unknown) => validateRequest(timeEntrySchema, data);
export const validateComment = (data: unknown) => validateRequest(commentSchema, data);
export const validateInvitation = (data: unknown) => validateRequest(invitationSchema, data);

// Validation middleware function for API routes
export function withValidation<T>(
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse,
  validator: (data: unknown) => { success: true; data: T } | { success: false; errors: string[] }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      let requestData: unknown;

      // Parse request body based on content type
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        requestData = await request.json();
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        requestData = Object.fromEntries(formData.entries());
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        requestData = Object.fromEntries(formData.entries());
      } else {
        // For GET requests, try to get data from URL params
        const url = new URL(request.url);
        requestData = Object.fromEntries(url.searchParams.entries());
      }

      // Sanitize the data
      const sanitizedData = sanitizeRequestData(requestData);

      // Validate the data
      const validation = validator(sanitizedData);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: (validation as any).errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated data
      return await handler(request, validation.data);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error during validation'
        },
        { status: 500 }
      );
    }
  };
}

// Rate limiting for validation failures (to prevent abuse)
const validationFailureCounts = new Map<string, { count: number; resetTime: number }>();

export function checkValidationFailureRate(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxFailures = 10;

  const record = validationFailureCounts.get(clientId);

  if (!record || now > record.resetTime) {
    validationFailureCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    return false; // Not rate limited
  }

  if (record.count >= maxFailures) {
    return true; // Rate limited
  }

  record.count++;
  return false; // Not rate limited
}

export function recordValidationFailure(clientId: string): void {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes

  const record = validationFailureCounts.get(clientId) || { count: 0, resetTime: now + windowMs };
  record.count++;

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  }

  validationFailureCounts.set(clientId, record);
}

// Input validation for common patterns
export const validators = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  uuid: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  slug: (value: string) => /^[a-z0-9-]+$/.test(value) && value.length >= 1 && value.length <= 50,
  positiveNumber: (value: unknown) => typeof value === 'number' && value > 0,
  nonNegativeNumber: (value: unknown) => typeof value === 'number' && value >= 0,
  dateString: (value: string) => !isNaN(Date.parse(value)),
  url: (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  phoneNumber: (value: string) => /^\+?[\d\s\-\(\)]{10,}$/.test(value),
  password: (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value),
};

// Data integrity checks
export async function validateDataIntegrity(data: any, entityType: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    switch (entityType) {
      case 'organization':
        if (!data.name || data.name.trim().length === 0) {
          errors.push('Organization name is required');
        }
        if (data.slug && !validators.slug(data.slug)) {
          errors.push('Organization slug must be lowercase alphanumeric with hyphens only');
        }
        break;

      case 'project':
        if (!data.name || data.name.trim().length === 0) {
          errors.push('Project name is required');
        }
        if (!data.organization_id || !validators.uuid(data.organization_id)) {
          errors.push('Valid organization ID is required');
        }
        if (data.start_date && data.end_date) {
          const start = new Date(data.start_date);
          const end = new Date(data.end_date);
          if (end < start) {
            errors.push('Project end date cannot be before start date');
          }
        }
        break;

      case 'task':
        if (!data.title || data.title.trim().length === 0) {
          errors.push('Task title is required');
        }
        if (!data.project_id || !validators.uuid(data.project_id)) {
          errors.push('Valid project ID is required');
        }
        if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
          errors.push('Invalid task priority');
        }
        if (data.status && !['todo', 'in_progress', 'review', 'completed', 'cancelled'].includes(data.status)) {
          errors.push('Invalid task status');
        }
        break;

      case 'time_entry':
        if (!data.user_id || !validators.uuid(data.user_id)) {
          errors.push('Valid user ID is required');
        }
        if (!data.start_time || !validators.dateString(data.start_time)) {
          errors.push('Valid start time is required');
        }
        if (data.end_time && !validators.dateString(data.end_time)) {
          errors.push('Invalid end time format');
        }
        if (data.duration_hours && !validators.nonNegativeNumber(data.duration_hours)) {
          errors.push('Duration must be a non-negative number');
        }
        break;

      case 'comment':
        if (!data.content || data.content.trim().length === 0) {
          errors.push('Comment content is required');
        }
        if (data.content && data.content.length > 2000) {
          errors.push('Comment content cannot exceed 2000 characters');
        }
        break;

      default:
        warnings.push(`No specific validation rules for entity type: ${entityType}`);
    }

    // Check for potentially unsafe content
    if (data.content || data.description) {
      const content = data.content || data.description;
      if (content.includes('<script') || content.includes('javascript:')) {
        errors.push('Content contains potentially unsafe HTML/JavaScript');
      }
    }

    // Check string lengths
    const maxLengths: Record<string, number> = {
      name: 200,
      title: 200,
      description: 2000,
      content: 2000,
      email: 255,
      full_name: 100,
    };

    for (const [field, maxLength] of Object.entries(maxLengths)) {
      if (data[field] && typeof data[field] === 'string' && data[field].length > maxLength) {
        errors.push(`${field} exceeds maximum length of ${maxLength} characters`);
      }
    }

  } catch (error) {
    errors.push('Validation process failed');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
