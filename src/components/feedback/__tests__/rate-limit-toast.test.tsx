import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  RateLimitToast,
  RateLimitAlert,
  RateLimitInline,
} from '../rate-limit-toast'

describe('RateLimitToast Component', () => {
  it('should render when visible', () => {
    render(
      <RateLimitToast
        isVisible={true}
        countdown={5}
        attempt={1}
      />
    )

    expect(screen.getByText(/Too Many Requests/)).toBeInTheDocument()
    expect(screen.getByText(/Retrying in 5 seconds/)).toBeInTheDocument()
  })

  it('should not render when not visible', () => {
    const { container } = render(
      <RateLimitToast
        isVisible={false}
        countdown={5}
        attempt={1}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should display correct attempt number', () => {
    render(
      <RateLimitToast
        isVisible={true}
        countdown={3}
        attempt={2}
      />
    )

    expect(screen.getByText(/Attempt 2/)).toBeInTheDocument()
  })

  it('should use singular second when countdown is 1', () => {
    render(
      <RateLimitToast
        isVisible={true}
        countdown={1}
        attempt={1}
      />
    )

    expect(screen.getByText(/Retrying in 1 second/)).toBeInTheDocument()
  })

  it('should use plural seconds when countdown is not 1', () => {
    render(
      <RateLimitToast
        isVisible={true}
        countdown={5}
        attempt={1}
      />
    )

    expect(screen.getByText(/Retrying in 5 seconds/)).toBeInTheDocument()
  })

  it('should show waiting message when not actively retrying', () => {
    render(
      <RateLimitToast
        isVisible={true}
        countdown={0}
        attempt={1}
      />
    )

    expect(screen.getByText(/Waiting for rate limit to reset/)).toBeInTheDocument()
  })

  it('should call onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    render(
      <RateLimitToast
        isVisible={true}
        countdown={0}
        attempt={1}
        onDismiss={onDismiss}
      />
    )

    const dismissButton = screen.getByLabelText(/Dismiss/)
    await user.click(dismissButton)

    expect(onDismiss).toHaveBeenCalled()
  })

  it('should not show dismiss button when actively retrying', () => {
    render(
      <RateLimitToast
        isVisible={true}
        countdown={5}
        attempt={1}
        onDismiss={vi.fn()}
      />
    )

    const dismissButton = screen.queryByLabelText(/Dismiss/)
    expect(dismissButton).not.toBeInTheDocument()
  })

  it('should show progress bar when retrying', () => {
    const { container } = render(
      <RateLimitToast
        isVisible={true}
        countdown={5}
        attempt={1}
      />
    )

    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeInTheDocument()
  })
})

describe('RateLimitAlert Component', () => {
  it('should render alert with default message', () => {
    render(<RateLimitAlert />)

    expect(screen.getByText(/Rate Limit Exceeded/)).toBeInTheDocument()
    expect(screen.getByText(/Too many requests/)).toBeInTheDocument()
  })

  it('should render alert with custom message', () => {
    const customMessage = 'Custom rate limit message'
    render(<RateLimitAlert message={customMessage} />)

    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  it('should show retry button when onRetry is provided', () => {
    render(<RateLimitAlert onRetry={vi.fn()} />)

    expect(screen.getByText(/Try Again/)).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()

    render(<RateLimitAlert onRetry={onRetry} />)

    const retryButton = screen.getByText(/Try Again/)
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalled()
  })

  it('should show dismiss button when onDismiss is provided', () => {
    render(<RateLimitAlert onDismiss={vi.fn()} />)

    expect(screen.getByText(/Dismiss/)).toBeInTheDocument()
  })

  it('should call onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    render(<RateLimitAlert onDismiss={onDismiss} />)

    const dismissButton = screen.getByText(/Dismiss/)
    await user.click(dismissButton)

    expect(onDismiss).toHaveBeenCalled()
  })

  it('should show both buttons when both callbacks are provided', () => {
    render(
      <RateLimitAlert
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByText(/Try Again/)).toBeInTheDocument()
    expect(screen.getByText(/Dismiss/)).toBeInTheDocument()
  })
})

describe('RateLimitInline Component', () => {
  it('should render countdown when retrying', () => {
    render(
      <RateLimitInline
        countdown={5}
        isRetrying={true}
      />
    )

    expect(screen.getByText(/Retrying in 5s/)).toBeInTheDocument()
  })

  it('should not render when not retrying and countdown is 0', () => {
    const { container } = render(
      <RateLimitInline
        countdown={0}
        isRetrying={false}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should use compact format when compact prop is true', () => {
    const { container } = render(
      <RateLimitInline
        countdown={3}
        isRetrying={true}
        compact={true}
      />
    )

    const text = container.textContent
    expect(text).toContain('Retrying in 3s')
  })

  it('should use expanded format when compact prop is false', () => {
    render(
      <RateLimitInline
        countdown={3}
        isRetrying={true}
        compact={false}
      />
    )

    expect(screen.getByText(/Too many requests/)).toBeInTheDocument()
  })

  it('should use singular second when countdown is 1', () => {
    render(
      <RateLimitInline
        countdown={1}
        isRetrying={true}
      />
    )

    expect(screen.getByText(/Retrying in 1 second/)).toBeInTheDocument()
  })

  it('should use plural seconds when countdown is not 1', () => {
    render(
      <RateLimitInline
        countdown={5}
        isRetrying={true}
      />
    )

    expect(screen.getByText(/Retrying in 5 seconds/)).toBeInTheDocument()
  })

  it('should show loading indicator when retrying', () => {
    const { container } = render(
      <RateLimitInline
        countdown={5}
        isRetrying={true}
        compact={true}
      />
    )

    const icon = container.querySelector('.animate-spin')
    expect(icon).toBeInTheDocument()
  })
})
