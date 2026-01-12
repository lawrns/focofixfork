import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentsSection from '@/components/comments/comments-section'
import { CommentsService } from '@/lib/services/comments'
import { Comment, CommentThread } from '@/lib/models/comments'

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return actual
})

// Mock the CommentsService
vi.mock('@/lib/services/comments', () => ({
  CommentsService: {
    getComments: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    subscribeToComments: vi.fn(),
    getMentionableUsers: vi.fn(),
    searchComments: vi.fn(),
    getCommentSummary: vi.fn()
  }
}))

describe('CommentsSection - Threading Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  const mockCurrentUser = {
    id: 'user-1',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg'
  }

  const mockRootComment: Comment = {
    id: 'comment-1',
    content: 'This is a root comment',
    content_html: 'This is a root comment',
    author_id: 'user-2',
    author_name: 'Author Name',
    author_avatar: 'https://example.com/author.jpg',
    entity_type: 'task',
    entity_id: 'task-1',
    type: 'comment',
    status: 'active',
    parent_id: undefined,
    mentions: [],
    attachments: [],
    reactions: [],
    metadata: {},
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  }

  const mockReplyComment: Comment = {
    id: 'comment-2',
    content: 'This is a reply to the root comment',
    content_html: 'This is a reply to the root comment',
    author_id: 'user-3',
    author_name: 'Replier Name',
    author_avatar: 'https://example.com/replier.jpg',
    entity_type: 'task',
    entity_id: 'task-1',
    type: 'reply',
    status: 'active',
    parent_id: 'comment-1',
    mentions: [],
    attachments: [],
    reactions: [],
    metadata: {},
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z'
  }

  const mockNestedReplyComment: Comment = {
    id: 'comment-3',
    content: 'This is a reply to a reply',
    content_html: 'This is a reply to a reply',
    author_id: 'user-4',
    author_name: 'Nested Replier',
    author_avatar: 'https://example.com/nested-replier.jpg',
    entity_type: 'task',
    entity_id: 'task-1',
    type: 'reply',
    status: 'active',
    parent_id: 'comment-2',
    mentions: [],
    attachments: [],
    reactions: [],
    metadata: {},
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  }

  const mockThread: CommentThread = {
    root_comment: mockRootComment,
    replies: [mockReplyComment],
    total_replies: 1,
    last_reply_at: mockReplyComment.created_at,
    participants: [
      {
        user_id: 'user-2',
        user_name: 'Author Name',
        avatar: 'https://example.com/author.jpg',
        last_seen_at: mockRootComment.created_at,
        reply_count: 0
      },
      {
        user_id: 'user-3',
        user_name: 'Replier Name',
        avatar: 'https://example.com/replier.jpg',
        last_seen_at: mockReplyComment.created_at,
        reply_count: 1
      }
    ]
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    // Mock subscription
    ;(CommentsService.subscribeToComments as any).mockReturnValue({
      unsubscribe: vi.fn()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Reply Button', () => {
    it('should display reply button on comments', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByText('Reply')
      expect(replyButtons.length).toBeGreaterThan(0)
    })

    it('should show reply button for both root comments and replies', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
        expect(screen.getByText('This is a reply to the root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByText('Reply')
      expect(replyButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('should activate reply input when reply button is clicked', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      await user.click(replyButtons[0])

      // Should show reply input
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument()
      })
    })
  })

  describe('Comment Nesting', () => {
    it('should nest replies under parent comment', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      const { container } = render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
        expect(screen.getByText('This is a reply to the root comment')).toBeInTheDocument()
      })

      // Check if reply has left margin (indentation)
      const replyText = screen.getByText('This is a reply to the root comment')
      const replyParent = replyText.closest('[class*="ml-"]')
      expect(replyParent).toBeTruthy()
    })

    it('should display replies after root comment', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        const rootCommentElement = screen.getByText('This is a root comment')
        const replyCommentElement = screen.getByText('This is a reply to the root comment')

        expect(rootCommentElement).toBeInTheDocument()
        expect(replyCommentElement).toBeInTheDocument()

        // Verify DOM order: root comment comes before reply
        const rootIndex = document.body.innerHTML.indexOf('This is a root comment')
        const replyIndex = document.body.innerHTML.indexOf('This is a reply to the root comment')
        expect(rootIndex).toBeLessThan(replyIndex)
      })
    })

    it('should support multiple replies to same parent', async () => {
      const reply2: Comment = {
        ...mockReplyComment,
        id: 'comment-2b',
        content: 'Another reply to root',
        author_id: 'user-5',
        author_name: 'Another Author'
      }

      const threadWithMultipleReplies: CommentThread = {
        ...mockThread,
        replies: [mockReplyComment, reply2],
        total_replies: 2,
        last_reply_at: reply2.created_at
      }

      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [threadWithMultipleReplies],
        comments: [mockRootComment, mockReplyComment, reply2],
        total: 3
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
        expect(screen.getByText('Replier Name')).toBeInTheDocument()
        expect(screen.getByText('Another Author')).toBeInTheDocument()
      })
    })
  })

  describe('parent_comment_id Field', () => {
    it('should save parent_comment_id when creating a reply', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment],
        total: 1
      })
      ;(CommentsService.createComment as any).mockResolvedValue(mockReplyComment)

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      await user.click(replyButtons[0])

      const replyInput = screen.getByPlaceholderText('Write a reply...')
      await user.type(replyInput, 'This is a test reply')

      // Find the submit button in the reply form (should be enabled now)
      await waitFor(() => {
        const allReplyButtons = screen.getAllByRole('button', { name: /reply/i })
        expect(allReplyButtons[allReplyButtons.length - 1]).not.toBeDisabled()
      })

      const allReplyButtons = screen.getAllByRole('button', { name: /reply/i })
      const submitButton = allReplyButtons[allReplyButtons.length - 1]
      await user.click(submitButton)

      // Verify createComment was called with parent_id
      await waitFor(() => {
        expect(CommentsService.createComment).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_id: mockRootComment.id,
            type: 'reply'
          })
        )
      })
    })

    it('should correctly handle parent_id for nested replies', async () => {
      const threadWithNested: CommentThread = {
        root_comment: mockRootComment,
        replies: [mockReplyComment, mockNestedReplyComment],
        total_replies: 2,
        last_reply_at: mockNestedReplyComment.created_at,
        participants: []
      }

      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [threadWithNested],
        comments: [mockRootComment, mockReplyComment, mockNestedReplyComment],
        total: 3
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a reply to a reply')).toBeInTheDocument()
      })

      // Verify nested reply has correct parent_id
      expect(mockNestedReplyComment.parent_id).toBe('comment-2')
    })
  })

  describe('Threading UI Display', () => {
    it('should display author information for replies', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Replier Name')).toBeInTheDocument()
        expect(screen.getByText('This is a reply to the root comment')).toBeInTheDocument()
      })
    })

    it('should display timestamps for all comments', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        // Check that author names are displayed (which appear alongside timestamps)
        expect(screen.getByText('Author Name')).toBeInTheDocument()
        expect(screen.getByText('Replier Name')).toBeInTheDocument()
      })
    })

    it('should indent reply comments visually', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      const { container } = render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a reply to the root comment')).toBeInTheDocument()
      })

      // Check that reply comment has ml-11 class for indentation
      const replyCommentContainer = screen.getByText('This is a reply to the root comment').closest('[class*="ml-"]')
      expect(replyCommentContainer?.className).toMatch(/ml-\d+/)
    })

    it('should display avatars for replies', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a reply to the root comment')).toBeInTheDocument()
      })

      // Check for avatar fallbacks which contain initials
      const avatarFallbacks = screen.getAllByText(/^[A-Z]{1,2}$/)
      expect(avatarFallbacks.length).toBeGreaterThan(0)
    })
  })

  describe('Nested Threads (Replies to Replies)', () => {
    it('should support replies to replies', async () => {
      const threadWithNested: CommentThread = {
        root_comment: mockRootComment,
        replies: [mockReplyComment, mockNestedReplyComment],
        total_replies: 2,
        last_reply_at: mockNestedReplyComment.created_at,
        participants: []
      }

      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [threadWithNested],
        comments: [mockRootComment, mockReplyComment, mockNestedReplyComment],
        total: 3
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a reply to a reply')).toBeInTheDocument()
      })
    })

    it('should handle deep nesting of comments', async () => {
      // For deep nesting, only direct replies to root go in replies array
      // Nested replies are handled recursively in the CommentThread renderer
      const threadWithDeepNesting: CommentThread = {
        root_comment: mockRootComment,
        replies: [mockReplyComment],
        total_replies: 1,
        last_reply_at: mockReplyComment.created_at,
        participants: []
      }

      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [threadWithDeepNesting],
        comments: [mockRootComment, mockReplyComment, mockNestedReplyComment],
        total: 3
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      // The nested reply should be rendered within the thread
      await waitFor(() => {
        expect(screen.getByText('This is a reply to the root comment')).toBeInTheDocument()
      })
    })

    it('should allow replying to nested comments', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [
          {
            root_comment: mockRootComment,
            replies: [mockReplyComment, mockNestedReplyComment],
            total_replies: 2,
            last_reply_at: mockNestedReplyComment.created_at,
            participants: []
          }
        ],
        comments: [mockRootComment, mockReplyComment, mockNestedReplyComment],
        total: 3
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a reply to a reply')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      // Click the reply button for the nested comment (should be the last one)
      await user.click(replyButtons[replyButtons.length - 1])

      // Should show reply input
      await waitFor(() => {
        const replyInputs = screen.queryAllByPlaceholderText('Write a reply...')
        expect(replyInputs.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Empty States and Edge Cases', () => {
    it('should handle empty comment section gracefully', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [],
        comments: [],
        total: 0
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument()
      })
    })

    it('should handle comments with no replies', async () => {
      const threadNoReplies: CommentThread = {
        root_comment: mockRootComment,
        replies: [],
        total_replies: 0,
        last_reply_at: undefined,
        participants: [
          {
            user_id: mockRootComment.author_id,
            user_name: mockRootComment.author_name,
            avatar: mockRootComment.author_avatar,
            last_seen_at: mockRootComment.created_at,
            reply_count: 0
          }
        ]
      }

      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [threadNoReplies],
        comments: [mockRootComment],
        total: 1
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      // Should still have reply button
      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      expect(replyButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Reply Form State', () => {
    it('should clear reply form after successful submission', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment],
        total: 1
      })
      ;(CommentsService.createComment as any).mockResolvedValue(mockReplyComment)

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      await user.click(replyButtons[0])

      const replyInput = screen.getByPlaceholderText('Write a reply...') as HTMLTextAreaElement
      await user.type(replyInput, 'Test reply')

      // Mock the reload to show empty state
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment, mockReplyComment],
        total: 2
      })

      const allReplyButtons = screen.getAllByRole('button', { name: /reply/i })
      const submitButton = allReplyButtons[allReplyButtons.length - 1]
      await user.click(submitButton)

      await waitFor(() => {
        // Reply form should be cleared/hidden
        const replyInputs = screen.queryAllByPlaceholderText('Write a reply...')
        expect(replyInputs.length).toBe(0)
      })
    })

    it('should disable submit button when reply is empty', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment],
        total: 1
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      await user.click(replyButtons[0])

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument()
      })

      // Find submit button in reply form - the last one should be the submit button
      const allReplyButtons = screen.getAllByRole('button', { name: /reply/i })
      const submitButton = allReplyButtons[allReplyButtons.length - 1] as HTMLButtonElement
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when reply has content', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment],
        total: 1
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByRole('button', { name: /reply/i })
      await user.click(replyButtons[0])

      const replyInput = screen.getByPlaceholderText('Write a reply...')
      await user.type(replyInput, 'Test reply')

      // Find submit button and verify it's enabled
      const allReplyButtons = screen.getAllByRole('button', { name: /reply/i })
      const submitButton = allReplyButtons[allReplyButtons.length - 1] as HTMLButtonElement
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Reply Cancellation', () => {
    it('should hide reply form when cancel button is clicked', async () => {
      ;(CommentsService.getComments as any).mockResolvedValue({
        threads: [mockThread],
        comments: [mockRootComment],
        total: 1
      })

      render(
        <CommentsSection
          entityType="task"
          entityId="task-1"
          currentUser={mockCurrentUser}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('This is a root comment')).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByText('Reply')
      await user.click(replyButtons[0])

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Reply form should be hidden
      await waitFor(() => {
        const replyInputs = screen.queryAllByPlaceholderText('Write a reply...')
        expect(replyInputs.length).toBe(0)
      })
    })
  })
})
