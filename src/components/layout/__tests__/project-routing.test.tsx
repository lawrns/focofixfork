import { render, screen, waitFor } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import * as React from 'react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

// Mock ThemeToggle
jest.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <div>Theme Toggle</div>,
}))

// Mock the project service to return test data with slugs
jest.mock('@/features/projects/services/projectClientService', () => ({
  ProjectClientService: {
    getUserProjects: jest.fn(() =>
      Promise.resolve({
        success: true,
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Project',
            slug: 'test-project',
            status: 'active',
            organization_id: null,
          },
        ],
      })
    ),
  },
}))

describe('Project Routing', () => {
  it('should use slug instead of ID in project links', async () => {
    const { container } = render(<Sidebar />)

    // Wait for projects to load
    await waitFor(() => {
      const projectLink = container.querySelector('a[href*="/projects/"]')
      expect(projectLink).toBeInTheDocument()
    })

    // Find the project link
    const projectLink = container.querySelector('a[href*="/projects/"]') as HTMLAnchorElement

    // Verify the link uses slug, not ID
    expect(projectLink?.href).toContain('/projects/test-project')
    expect(projectLink?.href).not.toContain('123e4567-e89b-12d3-a456-426614174000')
  })

  it('should have title attribute for accessibility', async () => {
    const { container } = render(<Sidebar />)

    await waitFor(() => {
      const projectLink = container.querySelector('a[href*="/projects/"]')
      expect(projectLink).toBeInTheDocument()
    })

    const projectLink = container.querySelector('a[href*="/projects/"]') as HTMLAnchorElement
    expect(projectLink?.title || projectLink?.getAttribute('aria-label')).toBeTruthy()
  })
})
