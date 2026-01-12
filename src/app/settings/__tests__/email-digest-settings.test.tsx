import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailDigestSettings from '../email-digest-settings';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Settings Page - Email Digest Settings', () => {
  let mockToast: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { toast } = await import('sonner');
    mockToast = toast;
  });

  describe('UI Rendering', () => {
    it('should render email digest settings section', () => {
      render(<EmailDigestSettings />);

      expect(screen.getByText('Email Digest')).toBeInTheDocument();
      expect(screen.getByText(/customize how and when you receive email digests/i)).toBeInTheDocument();
    });

    it('should render digest frequency options', () => {
      render(<EmailDigestSettings />);

      expect(screen.getByText('Digest Frequency')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /none/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /daily/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /weekly/i })).toBeInTheDocument();
    });

    it('should render time picker when daily digest is selected', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const dailyOption = screen.getByRole('radio', { name: /daily/i });
      await user.click(dailyOption);

      expect(screen.getByLabel(/digest time/i)).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /hour/i })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /minute/i })).toBeInTheDocument();
    });

    it('should render day and time picker when weekly digest is selected', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const weeklyOption = screen.getByRole('radio', { name: /weekly/i });
      await user.click(weeklyOption);

      expect(screen.getByLabel(/digest day/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /day of week/i })).toBeInTheDocument();
      expect(screen.getByLabel(/digest time/i)).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /hour/i })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /minute/i })).toBeInTheDocument();
    });

    it('should render digest content checkboxes', () => {
      render(<EmailDigestSettings />);

      expect(screen.getByLabelText('Overdue tasks')).toBeInTheDocument();
      expect(screen.getByLabelText('Tasks due today')).toBeInTheDocument();
      expect(screen.getByLabelText('Completed tasks')).toBeInTheDocument();
      expect(screen.getByLabelText('New comments')).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<EmailDigestSettings />);

      expect(screen.getByRole('button', { name: /save digest settings/i })).toBeInTheDocument();
    });
  });

  describe('Frequency Selection', () => {
    it('should start with none frequency selected by default', () => {
      render(<EmailDigestSettings />);

      const noneOption = screen.getByRole('radio', { name: /none/i }) as HTMLInputElement;
      expect(noneOption.checked).toBe(true);
    });

    it('should hide time picker when none is selected', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const dailyOption = screen.getByRole('radio', { name: /daily/i });
      await user.click(dailyOption);

      expect(screen.getByLabel(/digest time/i)).toBeInTheDocument();

      const noneOption = screen.getByRole('radio', { name: /none/i });
      await user.click(noneOption);

      expect(screen.queryByLabel(/digest time/i)).not.toBeInTheDocument();
    });

    it('should toggle frequency selection', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const dailyOption = screen.getByRole('radio', { name: /daily/i }) as HTMLInputElement;
      expect(dailyOption.checked).toBe(false);

      await user.click(dailyOption);
      expect(dailyOption.checked).toBe(true);

      const weeklyOption = screen.getByRole('radio', { name: /weekly/i }) as HTMLInputElement;
      await user.click(weeklyOption);
      expect(weeklyOption.checked).toBe(true);
      expect(dailyOption.checked).toBe(false);
    });
  });

  describe('Time Selection', () => {
    it('should allow setting custom digest time for daily', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const dailyOption = screen.getByRole('radio', { name: /daily/i });
      await user.click(dailyOption);

      const hourInput = screen.getByRole('spinbutton', { name: /hour/i });
      const minuteInput = screen.getByRole('spinbutton', { name: /minute/i });

      await user.clear(hourInput);
      await user.type(hourInput, '14');
      await user.clear(minuteInput);
      await user.type(minuteInput, '30');

      expect(hourInput).toHaveValue(14);
      expect(minuteInput).toHaveValue(30);
    });

    it('should allow selecting day and time for weekly digest', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const weeklyOption = screen.getByRole('radio', { name: /weekly/i });
      await user.click(weeklyOption);

      const daySelect = screen.getByRole('combobox', { name: /day of week/i });
      await user.click(daySelect);
      const mondayOption = screen.getByText('Monday');
      await user.click(mondayOption);

      const hourInput = screen.getByRole('spinbutton', { name: /hour/i });
      await user.clear(hourInput);
      await user.type(hourInput, '09');

      expect(daySelect).toHaveValue('monday');
      expect(hourInput).toHaveValue(9);
    });
  });

  describe('Content Selection', () => {
    it('should toggle content checkboxes', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const overdueCheckbox = screen.getByLabelText('Overdue tasks') as HTMLInputElement;
      expect(overdueCheckbox.checked).toBe(true);

      await user.click(overdueCheckbox);
      expect(overdueCheckbox.checked).toBe(false);

      await user.click(overdueCheckbox);
      expect(overdueCheckbox.checked).toBe(true);
    });

    it('should allow selecting multiple content types', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const overdueCheckbox = screen.getByLabelText('Overdue tasks') as HTMLInputElement;
      const dueTodayCheckbox = screen.getByLabelText('Tasks due today') as HTMLInputElement;
      const completedCheckbox = screen.getByLabelText('Completed tasks') as HTMLInputElement;
      const commentsCheckbox = screen.getByLabelText('New comments') as HTMLInputElement;

      expect(overdueCheckbox.checked).toBe(true);
      expect(dueTodayCheckbox.checked).toBe(true);
      expect(completedCheckbox.checked).toBe(true);
      expect(commentsCheckbox.checked).toBe(true);

      await user.click(completedCheckbox);
      expect(completedCheckbox.checked).toBe(false);

      expect(overdueCheckbox.checked).toBe(true);
      expect(dueTodayCheckbox.checked).toBe(true);
      expect(commentsCheckbox.checked).toBe(true);
    });
  });

  describe('Save Functionality', () => {
    it('should save digest settings when Save button is clicked', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailDigestSettings />);

      const dailyOption = screen.getByRole('radio', { name: /daily/i });
      await user.click(dailyOption);

      const saveButton = screen.getByRole('button', { name: /save digest settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/user/digest-preferences',
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    it('should include digest preferences in API request', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailDigestSettings />);

      const dailyOption = screen.getByRole('radio', { name: /daily/i });
      await user.click(dailyOption);

      const hourInput = screen.getByRole('spinbutton', { name: /hour/i });
      await user.clear(hourInput);
      await user.type(hourInput, '15');

      const overdueCheckbox = screen.getByLabelText('Overdue tasks');
      await user.click(overdueCheckbox); // Turn off

      const saveButton = screen.getByRole('button', { name: /save digest settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        const callArgs = (global.fetch as any).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body.digestPreferences).toBeDefined();
        expect(body.digestPreferences.frequency).toBe('daily');
        expect(body.digestPreferences.digestTime).toEqual({ hour: 15, minute: expect.any(Number) });
        expect(body.digestPreferences.contentSelection).toBeDefined();
        expect(body.digestPreferences.contentSelection.overdue).toBe(false);
      });
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      );

      render(<EmailDigestSettings />);

      const saveButton = screen.getByRole('button', { name: /save digest settings/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('should show success toast after saving', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EmailDigestSettings />);

      const saveButton = screen.getByRole('button', { name: /save digest settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Email digest settings saved successfully');
      });
    });

    it('should show error toast on failed save', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

      render(<EmailDigestSettings />);

      const saveButton = screen.getByRole('button', { name: /save digest settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to save email digest settings');
      });
    });
  });

  describe('Weekly Digest Specifics', () => {
    it('should only show weekly day picker when weekly is selected', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      expect(screen.queryByRole('combobox', { name: /day of week/i })).not.toBeInTheDocument();

      const weeklyOption = screen.getByRole('radio', { name: /weekly/i });
      await user.click(weeklyOption);

      expect(screen.getByRole('combobox', { name: /day of week/i })).toBeInTheDocument();
    });

    it('should have default weekly day set to Monday', async () => {
      const user = userEvent.setup();
      render(<EmailDigestSettings />);

      const weeklyOption = screen.getByRole('radio', { name: /weekly/i });
      await user.click(weeklyOption);

      const daySelect = screen.getByRole('combobox', { name: /day of week/i });
      expect(daySelect).toHaveValue('monday');
    });
  });

  describe('Content Selection Defaults', () => {
    it('should have all content types enabled by default', () => {
      render(<EmailDigestSettings />);

      expect(screen.getByLabelText('Overdue tasks')).toBeChecked();
      expect(screen.getByLabelText('Tasks due today')).toBeChecked();
      expect(screen.getByLabelText('Completed tasks')).toBeChecked();
      expect(screen.getByLabelText('New comments')).toBeChecked();
    });
  });
});
