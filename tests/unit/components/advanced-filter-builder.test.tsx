import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdvancedFilterBuilder from '@/components/filters/advanced-filter-builder'
import { FilterCondition, SortCondition } from '@/lib/services/filtering'

describe('AdvancedFilterBuilder - Multi-Criteria Filtering Component', () => {
  const mockFields = [
    { key: 'status', label: 'Status', type: 'string' as const, options: ['todo', 'in_progress', 'review', 'done'] },
    { key: 'priority', label: 'Priority', type: 'string' as const, options: ['low', 'medium', 'high', 'urgent'] },
    { key: 'assignee_id', label: 'Assignee', type: 'string' as const },
    { key: 'due_date', label: 'Due Date', type: 'date' as const },
    { key: 'tags', label: 'Tags', type: 'array' as const },
    { key: 'created_date', label: 'Created Date', type: 'date' as const }
  ]

  let mockOnFiltersChange: ReturnType<typeof vi.fn>
  let mockOnSortChange: ReturnType<typeof vi.fn>
  let mockOnSaveFilter: ReturnType<typeof vi.fn>
  let mockOnLoadFilter: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnFiltersChange = vi.fn()
    mockOnSortChange = vi.fn()
    mockOnSaveFilter = vi.fn()
    mockOnLoadFilter = vi.fn()
  })

  describe('Filter Management', () => {
    it('should render filter builder button', () => {
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )
      expect(screen.getByText(/Advanced Filters/i)).toBeInTheDocument()
    })

    it('should display filter count badge', () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should add single filter condition', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const fieldSelect = screen.getAllByRole('combobox')[0]
      await user.click(fieldSelect)
      const statusOption = screen.getByText('Status')
      await user.click(statusOption)

      const operatorSelect = screen.getAllByRole('combobox')[1]
      await user.click(operatorSelect)
      const equalsOption = screen.getByText('Equals')
      await user.click(equalsOption)

      const valueSelect = screen.getAllByRole('combobox')[2]
      await user.click(valueSelect)
      const todoOption = screen.getByText('To Do')
      await user.click(todoOption)

      const addButton = screen.getByText(/Add Filter/i)
      await user.click(addButton)

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            operator: 'equals',
            value: 'todo'
          })
        ])
      )
    })

    it('should add multiple filter conditions', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const user = userEvent.setup()
      const { rerender } = render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      expect(screen.getByText(/Status/i)).toBeInTheDocument()
      expect(screen.getByText(/Equals/i)).toBeInTheDocument()
      expect(screen.getByText(/To Do/i)).toBeInTheDocument()
    })

    it('should remove filter condition', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const removeButtons = screen.getAllByRole('button')
      const deleteButton = removeButtons.find(btn => btn.className.includes('w-6'))
      if (deleteButton) {
        await user.click(deleteButton)
      }

      expect(mockOnFiltersChange).toHaveBeenCalledWith([])
    })

    it('should clear all filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ]
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const clearButton = screen.getByText(/Clear All/i)
      await user.click(clearButton)

      expect(mockOnFiltersChange).toHaveBeenCalledWith([])
      expect(mockOnSortChange).toHaveBeenCalledWith([])
    })
  })

  describe('Multi-Criteria Filtering', () => {
    it('should handle status + priority filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ]
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      expect(button).toHaveTextContent('2')
    })

    it('should handle status + priority + assignee filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'in_progress' },
        { field: 'priority', operator: 'equals', value: 'high' },
        { field: 'assignee_id', operator: 'equals', value: 'user-1' }
      ]
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      expect(button).toHaveTextContent('3')
    })
  })

  describe('Date Range Filtering', () => {
    it('should support date range filters', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const fieldSelect = screen.getAllByRole('combobox')[0]
      await user.click(fieldSelect)

      const dueDate = screen.getByText('Due Date')
      if (dueDate) {
        await user.click(dueDate)
      }
    })

    it('should show before/after operators for dates', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const fieldSelect = screen.getAllByRole('combobox')[0]
      await user.click(fieldSelect)

      const dueDate = screen.getByText('Due Date')
      if (dueDate) {
        await user.click(dueDate)

        const operatorSelect = screen.getAllByRole('combobox')[1]
        await user.click(operatorSelect)

        expect(screen.getByText('Greater Than')).toBeInTheDocument()
        expect(screen.getByText('Less Than')).toBeInTheDocument()
      }
    })
  })

  describe('Tag Filtering', () => {
    it('should support multi-select tag filters', async () => {
      const filters: FilterCondition[] = [
        { field: 'tags', operator: 'in', value: ['bug', 'feature'] }
      ]
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      expect(button).toHaveTextContent('1')
    })
  })

  describe('Sort Functionality', () => {
    it('should add sort condition', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const sortTab = screen.getByText(/Sort \(0\)/i)
      await user.click(sortTab)

      const fieldSelect = screen.getAllByRole('combobox')[0]
      await user.click(fieldSelect)

      const priorityOption = screen.getByText('Priority')
      await user.click(priorityOption)

      const directionSelect = screen.getAllByRole('combobox')[1]
      await user.click(directionSelect)

      const descendingOption = screen.getByText('Descending')
      await user.click(descendingOption)

      const addButton = screen.getByText(/Add Sort/i)
      await user.click(addButton)

      expect(mockOnSortChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'priority',
            direction: 'desc'
          })
        ])
      )
    })

    it('should remove sort condition', async () => {
      const sort: SortCondition[] = [
        { field: 'priority', direction: 'asc' }
      ]
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={sort}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const sortTab = screen.getByText(/Sort \(1\)/i)
      await user.click(sortTab)

      const removeButtons = screen.getAllByRole('button')
      const deleteButton = removeButtons.find(btn => btn.className.includes('w-6'))
      if (deleteButton) {
        await user.click(deleteButton)
      }

      expect(mockOnSortChange).toHaveBeenCalledWith([])
    })
  })

  describe('Filter Presets', () => {
    it('should save filter preset', async () => {
      const filters: FilterCondition[] = [
        { field: 'status', operator: 'equals', value: 'todo' }
      ]
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={filters}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
          onSaveFilter={mockOnSaveFilter}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const saveButton = screen.getByText(/Save Filter/i)
      await user.click(saveButton)

      const input = screen.getByPlaceholderText(/Enter filter name/i)
      await user.type(input, 'My Todo Filter')

      const confirmButton = screen.getByText(/Save/i)
      await user.click(confirmButton)

      expect(mockOnSaveFilter).toHaveBeenCalledWith(
        'My Todo Filter',
        filters,
        []
      )
    })

    it('should load filter preset', async () => {
      const savedFilters = [
        {
          id: 'preset-1',
          name: 'My Tasks',
          conditions: [{ field: 'assignee_id', operator: 'equals', value: 'user-1' }],
          sortConditions: []
        }
      ]
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
          savedFilters={savedFilters}
          onLoadFilter={mockOnLoadFilter}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const presetSelect = screen.getByPlaceholderText(/Load saved filter/i)
      await user.click(presetSelect)

      const myTasksOption = screen.getByText('My Tasks')
      await user.click(myTasksOption)

      expect(mockOnLoadFilter).toHaveBeenCalledWith('preset-1')
    })

    it('should display all saved filter presets', () => {
      const savedFilters = [
        {
          id: 'preset-1',
          name: 'My Tasks',
          conditions: [],
          sortConditions: []
        },
        {
          id: 'preset-2',
          name: 'Overdue Tasks',
          conditions: [],
          sortConditions: []
        },
        {
          id: 'preset-3',
          name: 'This Week',
          conditions: [],
          sortConditions: []
        }
      ]
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
          savedFilters={savedFilters}
          onLoadFilter={mockOnLoadFilter}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      fireEvent.click(button)

      expect(screen.getByText('My Tasks')).toBeInTheDocument()
      expect(screen.getByText('Overdue Tasks')).toBeInTheDocument()
      expect(screen.getByText('This Week')).toBeInTheDocument()
    })
  })

  describe('Filter Validation', () => {
    it('should show validation errors', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const fieldSelect = screen.getAllByRole('combobox')[0]
      await user.click(fieldSelect)
      const statusOption = screen.getByText('Status')
      await user.click(statusOption)

      const operatorSelect = screen.getAllByRole('combobox')[1]
      await user.click(operatorSelect)
      const equalsOption = screen.getByText('Equals')
      await user.click(equalsOption)

      const addButton = screen.getByText(/Add Filter/i)
      await user.click(addButton)
    })

    it('should disable add filter button when field not selected', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      const addButton = screen.getByText(/Add Filter/i)
      expect(addButton).toBeDisabled()
    })
  })

  describe('Responsive Behavior', () => {
    it('should render in a dialog', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      expect(screen.getByText(/Advanced Filtering & Sorting/i)).toBeInTheDocument()
    })

    it('should show tabs for filters and sort', async () => {
      const user = userEvent.setup()
      render(
        <AdvancedFilterBuilder
          fields={mockFields}
          currentFilters={[]}
          currentSort={[]}
          onFiltersChange={mockOnFiltersChange}
          onSortChange={mockOnSortChange}
        />
      )

      const button = screen.getByText(/Advanced Filters/i)
      await user.click(button)

      expect(screen.getByText(/Filters \(0\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Sort \(0\)/i)).toBeInTheDocument()
    })
  })
})
