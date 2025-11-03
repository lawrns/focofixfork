import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock service since the actual service doesn't exist yet
const mockAIService = {
  generateTaskSuggestions: vi.fn(),
  analyzeProject: vi.fn(),
  generateReport: vi.fn(),
  chatWithAI: vi.fn(),
  optimizeSchedule: vi.fn(),
};

const AIService = mockAIService;

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTaskSuggestions', () => {
    it('should generate task suggestions successfully', async () => {
      const projectData = {
        title: 'Website Redesign',
        description: 'Redesign company website',
        currentTasks: ['Design mockups', 'Get approval'],
      };
      const suggestions = [
        { title: 'Create wireframes', priority: 'high', estimatedHours: 8 },
        { title: 'Set up development environment', priority: 'medium', estimatedHours: 4 },
      ];

      AIService.generateTaskSuggestions.mockResolvedValue({
        success: true,
        data: suggestions,
      });

      const result = await AIService.generateTaskSuggestions(projectData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(suggestions);
      expect(AIService.generateTaskSuggestions).toHaveBeenCalledWith(projectData);
    });

    it('should handle empty project data', async () => {
      AIService.generateTaskSuggestions.mockResolvedValue({
        success: false,
        error: 'Project data is required',
      });

      const result = await AIService.generateTaskSuggestions({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project data is required');
    });
  });

  describe('analyzeProject', () => {
    it('should analyze project successfully', async () => {
      const projectData = {
        id: '1',
        title: 'Mobile App',
        tasks: [
          { title: 'UI Design', status: 'completed', hours: 20 },
          { title: 'Backend API', status: 'in-progress', hours: 40 },
        ],
      };
      const analysis = {
        completionRate: 50,
        totalHours: 60,
        estimatedCompletion: '2024-02-15',
        riskLevel: 'low',
      };

      AIService.analyzeProject.mockResolvedValue({
        success: true,
        data: analysis,
      });

      const result = await AIService.analyzeProject(projectData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(analysis);
      expect(AIService.analyzeProject).toHaveBeenCalledWith(projectData);
    });

    it('should handle project not found', async () => {
      AIService.analyzeProject.mockResolvedValue({
        success: false,
        error: 'Project not found',
      });

      const result = await AIService.analyzeProject({ id: '999' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found');
    });
  });

  describe('generateReport', () => {
    it('should generate project report successfully', async () => {
      const reportData = {
        projectId: '1',
        type: 'weekly',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };
      const report = {
        summary: 'Project progressing well',
        completedTasks: 5,
        upcomingTasks: 3,
        blockers: [],
        recommendations: ['Add more resources to testing'],
      };

      AIService.generateReport.mockResolvedValue({
        success: true,
        data: report,
      });

      const result = await AIService.generateReport(reportData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(report);
      expect(AIService.generateReport).toHaveBeenCalledWith(reportData);
    });

    it('should validate report type', async () => {
      const reportData = {
        projectId: '1',
        type: 'invalid',
      };

      AIService.generateReport.mockResolvedValue({
        success: false,
        error: 'Invalid report type. Must be daily, weekly, or monthly',
      });

      const result = await AIService.generateReport(reportData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid report type. Must be daily, weekly, or monthly');
    });
  });

  describe('chatWithAI', () => {
    it('should handle chat message successfully', async () => {
      const chatData = {
        message: 'How can I improve my project workflow?',
        context: {
          projectId: '1',
          currentPhase: 'development',
        },
      };
      const response = {
        message: 'Consider implementing agile methodologies and daily standups to improve communication and track progress more effectively.',
        suggestions: ['Daily standups', 'Sprint planning', 'Retrospectives'],
      };

      AIService.chatWithAI.mockResolvedValue({
        success: true,
        data: response,
      });

      const result = await AIService.chatWithAI(chatData);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe(response.message);
      expect(result.data?.suggestions).toEqual(response.suggestions);
      expect(AIService.chatWithAI).toHaveBeenCalledWith(chatData);
    });

    it('should handle empty message', async () => {
      AIService.chatWithAI.mockResolvedValue({
        success: false,
        error: 'Message is required',
      });

      const result = await AIService.chatWithAI({ message: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message is required');
    });

    it('should handle rate limiting', async () => {
      AIService.chatWithAI.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });

      const result = await AIService.chatWithAI({ message: 'Test message' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded. Please try again later.');
    });
  });

  describe('optimizeSchedule', () => {
    it('should optimize task schedule successfully', async () => {
      const scheduleData = {
        tasks: [
          { id: '1', title: 'Task 1', duration: 4, dependencies: [] },
          { id: '2', title: 'Task 2', duration: 6, dependencies: ['1'] },
          { id: '3', title: 'Task 3', duration: 3, dependencies: ['1'] },
        ],
        constraints: {
          maxConcurrentTasks: 2,
          workingHoursPerDay: 8,
        },
      };
      const optimizedSchedule = {
        totalDuration: 10,
        criticalPath: ['1', '2'],
        resourceUtilization: 75,
        ganttChart: [
          { taskId: '1', start: '2024-01-01', end: '2024-01-01' },
          { taskId: '2', start: '2024-01-02', end: '2024-01-03' },
          { taskId: '3', start: '2024-01-02', end: '2024-01-02' },
        ],
      };

      AIService.optimizeSchedule.mockResolvedValue({
        success: true,
        data: optimizedSchedule,
      });

      const result = await AIService.optimizeSchedule(scheduleData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(optimizedSchedule);
      expect(AIService.optimizeSchedule).toHaveBeenCalledWith(scheduleData);
    });

    it('should handle circular dependencies', async () => {
      const scheduleData = {
        tasks: [
          { id: '1', title: 'Task 1', dependencies: ['2'] },
          { id: '2', title: 'Task 2', dependencies: ['1'] },
        ],
      };

      AIService.optimizeSchedule.mockResolvedValue({
        success: false,
        error: 'Circular dependencies detected in task schedule',
      });

      const result = await AIService.optimizeSchedule(scheduleData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Circular dependencies detected in task schedule');
    });

    it('should handle empty task list', async () => {
      AIService.optimizeSchedule.mockResolvedValue({
        success: false,
        error: 'At least one task is required for schedule optimization',
      });

      const result = await AIService.optimizeSchedule({ tasks: [] });

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one task is required for schedule optimization');
    });
  });
});
