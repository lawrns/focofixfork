import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/ui/empty-state-standard';
import {
  Inbox,
  FolderKanban,
  CheckCircle2,
  Search,
  Users,
  FileText,
} from 'lucide-react';
import { checkAccessibility } from '../setup';

describe('EmptyState Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders title and description', () => {
      render(
        <EmptyState
          title="No items found"
          description="There are no items to display."
        />
      );

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      const { container } = render(
        <EmptyState
          icon={Inbox}
          title="Empty Inbox"
          description="No messages."
        />
      );

      expect(screen.getByText('Empty Inbox')).toBeInTheDocument();
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders with illustration', () => {
      const illustration = <div data-testid="custom-illustration">📭</div>;
      render(
        <EmptyState
          illustration={illustration}
          title="Empty State"
          description="Description."
        />
      );

      expect(screen.getByTestId('custom-illustration')).toBeInTheDocument();
    });

    it('renders small size', () => {
      const { container } = render(
        <EmptyState
          title="Small"
          description="Small empty state"
          size="sm"
        />
      );

      const wrapper = container.querySelector('[class*="py-8"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders medium size', () => {
      const { container } = render(
        <EmptyState
          title="Medium"
          description="Medium empty state"
          size="md"
        />
      );

      const wrapper = container.querySelector('[class*="py-12"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(
        <EmptyState
          title="Large"
          description="Large empty state"
          size="lg"
        />
      );

      const wrapper = container.querySelector('[class*="py-16"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <EmptyState
          title="Custom"
          description="Custom className"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Primary Action', () => {
    it('renders primary action button', () => {
      render(
        <EmptyState
          title="No items"
          description="Create one to get started."
          primaryAction={{
            label: 'Create Item',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByRole('button', { name: /create item/i })).toBeInTheDocument();
    });

    it('calls onClick when primary action clicked', async () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          description="Create one to get started."
          primaryAction={{
            label: 'Create Item',
            onClick: handleClick,
          }}
        />
      );

      const button = screen.getByRole('button', { name: /create item/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders primary action without secondary action', () => {
      render(
        <EmptyState
          title="No items"
          description="Create one to get started."
          primaryAction={{
            label: 'Create Item',
            onClick: vi.fn(),
          }}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
    });
  });

  describe('Secondary Action', () => {
    it('renders secondary action button', () => {
      render(
        <EmptyState
          title="No results"
          description="Try adjusting your search."
          primaryAction={{
            label: 'Clear Search',
            onClick: vi.fn(),
          }}
          secondaryAction={{
            label: 'Browse All',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /browse all/i })).toBeInTheDocument();
    });

    it('calls onClick when secondary action clicked', async () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="No results"
          description="Try adjusting your search."
          primaryAction={{
            label: 'Clear Search',
            onClick: vi.fn(),
          }}
          secondaryAction={{
            label: 'Browse All',
            onClick: handleClick,
          }}
        />
      );

      const button = screen.getByRole('button', { name: /browse all/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders both primary and secondary actions', () => {
      render(
        <EmptyState
          title="No results"
          description="Try adjusting your search."
          primaryAction={{
            label: 'Clear Search',
            onClick: vi.fn(),
          }}
          secondaryAction={{
            label: 'Browse All',
            onClick: vi.fn(),
          }}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Empty State Variants', () => {
    it('renders inbox empty state', () => {
      render(
        <EmptyState
          icon={Inbox}
          title="You're all caught up"
          description="Mentions, assignments, and approvals will show up here."
          primaryAction={{
            label: 'Go to My Work',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByText("You're all caught up")).toBeInTheDocument();
      expect(screen.getByText(/Mentions, assignments/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to my work/i })).toBeInTheDocument();
    });

    it('renders projects empty state', () => {
      render(
        <EmptyState
          icon={FolderKanban}
          title="Start your first project"
          description="Projects organize tasks, docs, and team conversations in one place."
          primaryAction={{
            label: 'Create project',
            onClick: vi.fn(),
          }}
          secondaryAction={{
            label: 'Import from CSV',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByText('Start your first project')).toBeInTheDocument();
      expect(screen.getByText(/Projects organize/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import from csv/i })).toBeInTheDocument();
    });

    it('renders tasks empty state', () => {
      render(
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Tasks help you track work that needs to get done."
          primaryAction={{
            label: 'Create task',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.getByText(/Tasks help you track/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
    });

    it('renders search results empty state', () => {
      render(
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try a different search term or check your filters."
          primaryAction={{
            label: 'Clear search',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText(/Try a different search/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('renders team members empty state', () => {
      render(
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite your team to collaborate on projects."
          primaryAction={{
            label: 'Invite member',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByText('No team members yet')).toBeInTheDocument();
      expect(screen.getByText(/Invite your team/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
    });
  });

  describe('Without Actions', () => {
    it('renders without any actions', () => {
      render(
        <EmptyState
          title="No activity"
          description="Activity will appear here as work progresses."
        />
      );

      expect(screen.getByText('No activity')).toBeInTheDocument();
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('renders with only description when no actions', () => {
      render(
        <EmptyState
          icon={FileText}
          title="No comments"
          description="Be the first to comment."
        />
      );

      expect(screen.getByText('No comments')).toBeInTheDocument();
      expect(screen.getByText('Be the first to comment.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has semantic heading structure', () => {
      render(
        <EmptyState
          title="Empty State"
          description="Description text."
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Empty State');
    });

    it('primary action button has accessible name', () => {
      render(
        <EmptyState
          title="No items"
          description="Create one to get started."
          primaryAction={{
            label: 'Create Item',
            onClick: vi.fn(),
          }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Create Item');
    });

    it('secondary action button has accessible name', () => {
      render(
        <EmptyState
          title="No results"
          description="Try adjusting your search."
          primaryAction={{
            label: 'Clear Search',
            onClick: vi.fn(),
          }}
          secondaryAction={{
            label: 'Browse All',
            onClick: vi.fn(),
          }}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveAccessibleName('Clear Search');
      expect(buttons[1]).toHaveAccessibleName('Browse All');
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <EmptyState
          icon={FolderKanban}
          title="Start your first project"
          description="Projects organize tasks, docs, and team conversations in one place."
          primaryAction={{
            label: 'Create project',
            onClick: vi.fn(),
          }}
        />
      );

      const violations = await checkAccessibility(container);
      expect(violations).toHaveLength(0);
    });

    it('is keyboard navigable', async () => {
      render(
        <EmptyState
          title="No items"
          description="Create one to get started."
          primaryAction={{
            label: 'Create Item',
            onClick: vi.fn(),
          }}
        />
      );

      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('maintains focus visibility', async () => {
      render(
        <EmptyState
          title="No items"
          description="Create one to get started."
          primaryAction={{
            label: 'Create Item',
            onClick: vi.fn(),
          }}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('has proper heading semantics with icon', () => {
      render(
        <EmptyState
          icon={Inbox}
          title="Empty Inbox"
          description="No messages."
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Empty Inbox');
    });
  });

  describe('Visual Hierarchy', () => {
    it('title has proper text styling', () => {
      render(
        <EmptyState
          title="No items"
          description="Create one."
        />
      );

      const title = screen.getByText('No items');
      expect(title).toHaveClass('text-zinc-900', 'dark:text-zinc-50');
    });

    it('description has proper text styling', () => {
      render(
        <EmptyState
          title="No items"
          description="Create one."
        />
      );

      const description = screen.getByText('Create one.');
      expect(description).toHaveClass('text-zinc-500');
    });

    it('sizes affect typography correctly', () => {
      const { rerender } = render(
        <EmptyState
          title="Title"
          description="Description"
          size="sm"
        />
      );

      let title = screen.getByText('Title');
      expect(title).toHaveClass('text-sm', 'font-semibold');

      rerender(
        <EmptyState
          title="Title"
          description="Description"
          size="md"
        />
      );

      title = screen.getByText('Title');
      expect(title).toHaveClass('text-base', 'font-semibold');

      rerender(
        <EmptyState
          title="Title"
          description="Description"
          size="lg"
        />
      );

      title = screen.getByText('Title');
      expect(title).toHaveClass('text-xl', 'font-semibold');
    });
  });

  describe('Responsive Behavior', () => {
    it('centers content by default', () => {
      const { container } = render(
        <EmptyState
          title="Centered"
          description="Content is centered"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'text-center');
    });

    it('maintains proper spacing on small screens', () => {
      render(
        <EmptyState
          title="Responsive"
          description="Works on all screens"
          size="sm"
        />
      );

      expect(screen.getByText('Responsive')).toBeInTheDocument();
    });

    it('maintains proper spacing on large screens', () => {
      render(
        <EmptyState
          title="Responsive"
          description="Works on all screens"
          size="lg"
        />
      );

      expect(screen.getByText('Responsive')).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('renders lucide icon correctly', () => {
      render(
        <EmptyState
          icon={Inbox}
          title="Empty"
          description="No items"
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('handles icon sizing for different states', () => {
      const { container } = render(
        <EmptyState
          icon={Inbox}
          title="Empty"
          description="No items"
          size="sm"
        />
      );

      let icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      // Icon should be in a circular background container
      expect(icon?.parentElement).toHaveClass('rounded-full');
    });

    it('skips icon rendering when not provided', () => {
      const { container } = render(
        <EmptyState
          title="Empty"
          description="No items"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long titles', () => {
      const longTitle = 'A'.repeat(100);
      render(
        <EmptyState
          title={longTitle}
          description="Description"
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles very long descriptions', () => {
      const longDescription = 'A sentence. '.repeat(50);
      render(
        <EmptyState
          title="Title"
          description={longDescription}
        />
      );

      const description = screen.getByText(/A sentence/);
      expect(description).toBeInTheDocument();
      // Description text will be present even if whitespace differs
      expect(description.textContent).toContain('A sentence.');
    });

    it('handles HTML entities in text', () => {
      render(
        <EmptyState
          title="Title &amp; More"
          description="Description &copy; 2024"
        />
      );

      expect(screen.getByText('Title & More')).toBeInTheDocument();
      expect(screen.getByText(/Description © 2024/i)).toBeInTheDocument();
    });

    it('handles empty or undefined optional props', () => {
      const { container } = render(
        <EmptyState
          title="Only Title"
          description="Only description"
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('handles rapid action clicks', async () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="No items"
          description="Create one."
          primaryAction={{
            label: 'Create',
            onClick: handleClick,
          }}
        />
      );

      const button = screen.getByRole('button');

      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        await user.click(button);
      }

      expect(handleClick).toHaveBeenCalledTimes(5);
    });
  });
});
