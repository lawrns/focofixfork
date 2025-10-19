'use client'

import { 
  githubIntegrationManifest, 
  githubIntegrationCode 
} from './github-integration'
import { 
  calendarIntegrationManifest, 
  calendarIntegrationCode 
} from './calendar-integration'
import { 
  timeTrackingManifest, 
  timeTrackingCode 
} from './time-tracking'
import { 
  customFieldsManifest, 
  customFieldsCode 
} from './custom-fields'

export interface BuiltInPowerUp {
  manifest: any
  code: string
  category: 'development' | 'productivity' | 'customization' | 'communication' | 'analytics' | 'integration'
  featured: boolean
  installed: boolean
}

export class PowerUpsRegistry {
  private static instance: PowerUpsRegistry
  private powerUps: Map<string, BuiltInPowerUp> = new Map()

  static getInstance(): PowerUpsRegistry {
    if (!PowerUpsRegistry.instance) {
      PowerUpsRegistry.instance = new PowerUpsRegistry()
    }
    return PowerUpsRegistry.instance
  }

  constructor() {
    this.registerBuiltInPowerUps()
  }

  private registerBuiltInPowerUps(): void {
    // GitHub Integration
    this.powerUps.set('github-integration', {
      manifest: githubIntegrationManifest,
      code: githubIntegrationCode,
      category: 'development',
      featured: true,
      installed: false
    })

    // Calendar Integration
    this.powerUps.set('calendar-integration', {
      manifest: calendarIntegrationManifest,
      code: calendarIntegrationCode,
      category: 'productivity',
      featured: false,
      installed: false
    })

    // Time Tracking
    this.powerUps.set('time-tracking', {
      manifest: timeTrackingManifest,
      code: timeTrackingCode,
      category: 'productivity',
      featured: true,
      installed: false
    })

    // Custom Fields
    this.powerUps.set('custom-fields', {
      manifest: customFieldsManifest,
      code: customFieldsCode,
      category: 'customization',
      featured: true,
      installed: false
    })
  }

  getAllPowerUps(): BuiltInPowerUp[] {
    return Array.from(this.powerUps.values())
  }

  getPowerUp(id: string): BuiltInPowerUp | null {
    return this.powerUps.get(id) || null
  }

  getPowerUpsByCategory(category: string): BuiltInPowerUp[] {
    return Array.from(this.powerUps.values()).filter(powerUp => powerUp.category === category)
  }

  getFeaturedPowerUps(): BuiltInPowerUp[] {
    return Array.from(this.powerUps.values()).filter(powerUp => powerUp.featured)
  }

  getInstalledPowerUps(): BuiltInPowerUp[] {
    return Array.from(this.powerUps.values()).filter(powerUp => powerUp.installed)
  }

  markAsInstalled(id: string): void {
    const powerUp = this.powerUps.get(id)
    if (powerUp) {
      powerUp.installed = true
    }
  }

  markAsUninstalled(id: string): void {
    const powerUp = this.powerUps.get(id)
    if (powerUp) {
      powerUp.installed = false
    }
  }

  getCategories(): string[] {
    const categories = new Set<string>()
    this.powerUps.forEach(powerUp => {
      categories.add(powerUp.category)
    })
    return Array.from(categories)
  }

  getPowerUpStats(): {
    total: number
    installed: number
    featured: number
    byCategory: Record<string, number>
  } {
    const stats = {
      total: this.powerUps.size,
      installed: 0,
      featured: 0,
      byCategory: {} as Record<string, number>
    }

    this.powerUps.forEach(powerUp => {
      if (powerUp.installed) stats.installed++
      if (powerUp.featured) stats.featured++
      
      if (!stats.byCategory[powerUp.category]) {
        stats.byCategory[powerUp.category] = 0
      }
      stats.byCategory[powerUp.category]++
    })

    return stats
  }

  searchPowerUps(query: string): BuiltInPowerUp[] {
    const lowercaseQuery = query.toLowerCase()
    return Array.from(this.powerUps.values()).filter(powerUp => 
      powerUp.manifest.name.toLowerCase().includes(lowercaseQuery) ||
      powerUp.manifest.description.toLowerCase().includes(lowercaseQuery) ||
      powerUp.manifest.author.toLowerCase().includes(lowercaseQuery)
    )
  }

  getPowerUpDependencies(id: string): string[] {
    const powerUp = this.powerUps.get(id)
    return powerUp?.manifest.dependencies || []
  }

  validatePowerUpCompatibility(id: string, currentVersion: string): {
    compatible: boolean
    reason?: string
  } {
    const powerUp = this.powerUps.get(id)
    if (!powerUp) {
      return { compatible: false, reason: 'Power-up not found' }
    }

    const manifest = powerUp.manifest
    
    // Check minimum version
    if (manifest.minVersion) {
      if (this.compareVersions(currentVersion, manifest.minVersion) < 0) {
        return { 
          compatible: false, 
          reason: `Requires version ${manifest.minVersion} or higher` 
        }
      }
    }

    // Check maximum version
    if (manifest.maxVersion) {
      if (this.compareVersions(currentVersion, manifest.maxVersion) > 0) {
        return { 
          compatible: false, 
          reason: `Compatible up to version ${manifest.maxVersion}` 
        }
      }
    }

    return { compatible: true }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length)
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0
      
      if (v1Part > v2Part) return 1
      if (v1Part < v2Part) return -1
    }
    
    return 0
  }

  // Export power-up for installation
  exportPowerUp(id: string): { manifest: any; code: string } | null {
    const powerUp = this.powerUps.get(id)
    if (!powerUp) return null

    return {
      manifest: powerUp.manifest,
      code: powerUp.code
    }
  }

  // Import custom power-up
  importPowerUp(id: string, manifest: any, code: string, category: string = 'custom'): void {
    this.powerUps.set(id, {
      manifest,
      code,
      category: category as any,
      featured: false,
      installed: false
    })
  }

  // Remove custom power-up
  removePowerUp(id: string): boolean {
    return this.powerUps.delete(id)
  }

  // Get power-up installation instructions
  getInstallationInstructions(id: string): string[] {
    const powerUp = this.powerUps.get(id)
    if (!powerUp) return []

    const instructions = [
      `1. Install ${powerUp.manifest.name} v${powerUp.manifest.version}`,
      `2. Configure required permissions:`,
      ...powerUp.manifest.permissions.map((perm: any) => 
        `   - ${perm.type}:${perm.resource} - ${perm.description}`
      ),
      `3. Enable the power-up in your project settings`,
      `4. Configure any required API keys or credentials`
    ]

    // Add specific instructions based on power-up type
    switch (id) {
      case 'github-integration':
        instructions.push(
          `5. Generate a GitHub Personal Access Token`,
          `6. Add the token to your power-up settings`,
          `7. Select repositories to connect`
        )
        break
      case 'calendar-integration':
        instructions.push(
          `5. Authorize access to your calendar service`,
          `6. Select which calendars to sync`,
          `7. Configure sync preferences`
        )
        break
      case 'time-tracking':
        instructions.push(
          `5. Set your default hourly rate`,
          `6. Configure time tracking reminders`,
          `7. Enable automatic time tracking if desired`
        )
        break
      case 'custom-fields':
        instructions.push(
          `5. Create custom fields for your projects`,
          `6. Define field types and validation rules`,
          `7. Apply fields to projects and tasks`
        )
        break
    }

    return instructions
  }

  // Get power-up troubleshooting guide
  getTroubleshootingGuide(id: string): { issue: string; solution: string }[] {
    const powerUp = this.powerUps.get(id)
    if (!powerUp) return []

    const commonIssues = [
      {
        issue: 'Power-up not loading',
        solution: 'Check browser console for errors and ensure all permissions are granted'
      },
      {
        issue: 'API requests failing',
        solution: 'Verify API keys and network connectivity'
      },
      {
        issue: 'Data not syncing',
        solution: 'Check sync settings and refresh the page'
      }
    ]

    // Add specific troubleshooting based on power-up type
    switch (id) {
      case 'github-integration':
        commonIssues.push(
          {
            issue: 'GitHub API rate limit exceeded',
            solution: 'Wait for rate limit to reset or use a different token'
          },
          {
            issue: 'Repository not found',
            solution: 'Check repository name and ensure you have access'
          }
        )
        break
      case 'calendar-integration':
        commonIssues.push(
          {
            issue: 'Calendar events not appearing',
            solution: 'Check calendar permissions and sync settings'
          },
          {
            issue: 'Duplicate events created',
            solution: 'Disable bidirectional sync or check for existing events'
          }
        )
        break
      case 'time-tracking':
        commonIssues.push(
          {
            issue: 'Time not being tracked',
            solution: 'Check if timer is running and browser permissions'
          },
          {
            issue: 'Inaccurate time calculations',
            solution: 'Clear browser cache and restart time tracking'
          }
        )
        break
      case 'custom-fields':
        commonIssues.push(
          {
            issue: 'Fields not saving',
            solution: 'Check field validation rules and required fields'
          },
          {
            issue: 'Fields not appearing',
            solution: 'Ensure fields are assigned to the correct project or task'
          }
        )
        break
    }

    return commonIssues
  }
}

export const powerUpsRegistry = PowerUpsRegistry.getInstance()
