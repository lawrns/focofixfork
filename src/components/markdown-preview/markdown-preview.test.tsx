import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkdownPreview } from './markdown-preview'

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Eye: () => <div data-testid="eye-icon">Eye</div>,
    Edit2: () => <div data-testid="edit-icon">Edit</div>,
  }
})

describe('MarkdownPreview Component', () => {
  describe('Markdown Rendering', () => {
    it('should render markdown bold text correctly', async () => {
      render(
        <MarkdownPreview
          value="This is **bold** text"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that bold text is rendered
      const boldElement = screen.getByText('bold')
      expect(boldElement.tagName.toLowerCase()).toBe('strong')
    })

    it('should render markdown italic text correctly', async () => {
      render(
        <MarkdownPreview
          value="This is *italic* text"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that italic text is rendered
      const italicElement = screen.getByText('italic')
      expect(italicElement.tagName.toLowerCase()).toBe('em')
    })

    it('should render markdown headers correctly', async () => {
      render(
        <MarkdownPreview
          value="# Header 1"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check header exists
      const h1 = screen.getByText('Header 1')
      expect(h1.tagName.toLowerCase()).toBe('h1')
    })

    it('should render markdown lists correctly', async () => {
      const listMarkdown = `- Item 1
- Item 2
- Item 3`

      render(
        <MarkdownPreview
          value={listMarkdown}
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check list items exist
      const items = screen.getAllByText(/Item \d/)
      expect(items.length).toBe(3)
    })

    it('should render markdown links correctly', async () => {
      render(
        <MarkdownPreview
          value="[Click here](https://example.com)"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that link is rendered
      const link = screen.getByRole('link', { name: /click here/i })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('should render markdown code blocks correctly', async () => {
      const markdown = `\`\`\`javascript
const hello = "world"
\`\`\``

      render(
        <MarkdownPreview
          value={markdown}
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that code is rendered
      const codeText = screen.getByText(/const hello/)
      expect(codeText).toBeTruthy()
    })

    it('should render inline code correctly', async () => {
      render(
        <MarkdownPreview
          value="Use the `console.log()` function"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that inline code is rendered
      const code = screen.getByText('console.log()')
      expect(code.tagName.toLowerCase()).toBe('code')
    })

    it('should render markdown images correctly', async () => {
      render(
        <MarkdownPreview
          value="![Alt text](https://example.com/image.png)"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that image is rendered
      const image = screen.getByAltText('Alt text')
      expect(image).toHaveAttribute('src', 'https://example.com/image.png')
    })

    it('should render blockquotes correctly', async () => {
      render(
        <MarkdownPreview
          value="> This is a blockquote"
          onChange={vi.fn()}
        />
      )

      // Switch to preview mode
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await userEvent.click(previewTab)

      // Check that blockquote is rendered
      const blockquote = screen.getByText(/this is a blockquote/i)
      expect(blockquote.closest('blockquote')).toBeTruthy()
    })
  })

  describe('Preview Toggle', () => {
    it('should toggle between edit and preview modes', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <MarkdownPreview
          value="# Test Heading"
          onChange={vi.fn()}
        />
      )

      // Initially should show textarea in edit mode
      const textareas = screen.getAllByRole('textbox')
      expect(textareas.length).toBeGreaterThan(0)
      expect(textareas[0]).toBeVisible()

      // Switch to preview
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await user.click(previewTab)

      // Should show preview content
      const h1 = screen.getByText('Test Heading')
      expect(h1.tagName.toLowerCase()).toBe('h1')

      // Switch back to edit
      const editTab = screen.getByRole('button', { name: /edit/i })
      await user.click(editTab)

      // Should show textarea again
      const textareasAfter = screen.getAllByRole('textbox')
      expect(textareasAfter.length).toBeGreaterThan(0)
      expect(textareasAfter[0]).toBeVisible()
    })

    it('should have preview button', async () => {
      render(
        <MarkdownPreview
          value="Test"
          onChange={vi.fn()}
        />
      )

      const previewButton = screen.getByRole('button', { name: /preview/i })
      expect(previewButton).toBeInTheDocument()
    })

    it('should have edit button', async () => {
      render(
        <MarkdownPreview
          value="Test"
          onChange={vi.fn()}
        />
      )

      const editButton = screen.getByRole('button', { name: /edit/i })
      expect(editButton).toBeInTheDocument()
    })
  })

  describe('Input Handling', () => {
    it('should call onChange when text is modified', async () => {
      const user = userEvent.setup()
      const mockOnChange = vi.fn()

      render(
        <MarkdownPreview
          value=""
          onChange={mockOnChange}
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'New text')

      expect(mockOnChange).toHaveBeenCalled()
    })

    it('should update preview when content changes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <MarkdownPreview
          value="# Initial"
          onChange={vi.fn()}
        />
      )

      // Switch to preview
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await user.click(previewTab)

      // Update content
      rerender(
        <MarkdownPreview
          value="# Updated"
          onChange={vi.fn()}
        />
      )

      // Should show updated content
      expect(screen.getByText('Updated')).toBeInTheDocument()
      expect(screen.queryByText('Initial')).not.toBeInTheDocument()
    })

    it('should preserve textarea content when switching modes', async () => {
      const user = userEvent.setup()
      const mockOnChange = vi.fn()

      render(
        <MarkdownPreview
          value="# Test Content"
          onChange={mockOnChange}
        />
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      const initialValue = textarea.value

      // Switch to preview
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await user.click(previewTab)

      // Switch back to edit
      const editTab = screen.getByRole('button', { name: /edit/i })
      await user.click(editTab)

      // Content should be preserved
      const textareaAfter = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textareaAfter.value).toBe(initialValue)
    })
  })

  describe('Styling and CSS', () => {
    it('should apply markdown preview styling', async () => {
      const user = userEvent.setup()
      render(
        <MarkdownPreview
          value="# Heading"
          onChange={vi.fn()}
        />
      )

      // Switch to preview
      const previewTab = screen.getByRole('button', { name: /preview/i })
      await user.click(previewTab)

      // Find preview container with h1
      const h1 = screen.getByText('Heading')
      const preview = h1.closest('.markdown-preview')
      expect(preview).toBeInTheDocument()
    })

    it('should have visible tab buttons', async () => {
      render(
        <MarkdownPreview
          value="Test"
          onChange={vi.fn()}
        />
      )

      const editBtn = screen.getByRole('button', { name: /edit/i })
      const previewBtn = screen.getByRole('button', { name: /preview/i })

      expect(editBtn).toBeVisible()
      expect(previewBtn).toBeVisible()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      render(
        <MarkdownPreview
          value=""
          onChange={vi.fn()}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('')
    })

    it('should handle content with special characters', async () => {
      render(
        <MarkdownPreview
          value="Test & special < > characters"
          onChange={vi.fn()}
        />
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toContain('&')
      expect(textarea.value).toContain('<')
      expect(textarea.value).toContain('>')
    })

    it('should handle very long content', async () => {
      const longContent = 'Test paragraph\n'.repeat(100)
      render(
        <MarkdownPreview
          value={longContent}
          onChange={vi.fn()}
        />
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value.length).toBeGreaterThan(500)
    })

    it('should handle disabled state', async () => {
      render(
        <MarkdownPreview
          value="Test"
          onChange={vi.fn()}
          disabled={true}
        />
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea).toBeDisabled()
    })
  })
})
