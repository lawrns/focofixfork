/**
 * Milestone Labels Entity Model
 * Defines the structure and operations for milestone label data
 */

export interface MilestoneLabel {
  id: string
  milestone_id: string
  name: string
  color: string | null
}

export interface CreateLabelData {
  milestone_id: string
  name: string
  color?: string | null
}

export interface UpdateLabelData {
  name?: string
  color?: string | null
}

export class MilestoneLabelModel {
  /**
   * Validate label data before creation
   */
  static validateCreate(data: CreateLabelData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Label name is required')
    }

    if (data.name && data.name.trim().length < 1) {
      errors.push('Label name must be at least 1 character long')
    }

    if (data.name && data.name.length > 50) {
      errors.push('Label name must be less than 50 characters')
    }

    if (!data.milestone_id || data.milestone_id.trim().length === 0) {
      errors.push('Milestone ID is required')
    }

    if (data.color && !this.isValidHexColor(data.color)) {
      errors.push('Color must be a valid hex color code (e.g., #FF0000)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate label data before update
   */
  static validateUpdate(data: UpdateLabelData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Label name cannot be empty')
      }

      if (data.name.trim().length < 1) {
        errors.push('Label name must be at least 1 character long')
      }

      if (data.name.length > 50) {
        errors.push('Label name must be less than 50 characters')
      }
    }

    if (data.color && !this.isValidHexColor(data.color)) {
      errors.push('Color must be a valid hex color code (e.g., #FF0000)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if label name is unique for a milestone
   */
  static isNameUnique(name: string, existingLabels: MilestoneLabel[]): boolean {
    return !existingLabels.some(label =>
      label.name.toLowerCase() === name.toLowerCase()
    )
  }

  /**
   * Get predefined color palette
   */
  static getPredefinedColors(): string[] {
    return [
      '#ef4444', // red
      '#f97316', // orange
      '#f59e0b', // amber
      '#eab308', // yellow
      '#84cc16', // lime
      '#22c55e', // green
      '#10b981', // emerald
      '#14b8a6', // teal
      '#06b6d4', // cyan
      '#0ea5e9', // sky
      '#3b82f6', // blue
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#d946ef', // fuchsia
      '#ec4899', // pink
      '#f43f5e', // rose
    ]
  }

  /**
   * Get color name for UI display
   */
  static getColorName(hexColor: string): string {
    const colorMap: Record<string, string> = {
      '#ef4444': 'Red',
      '#f97316': 'Orange',
      '#f59e0b': 'Amber',
      '#eab308': 'Yellow',
      '#84cc16': 'Lime',
      '#22c55e': 'Green',
      '#10b981': 'Emerald',
      '#14b8a6': 'Teal',
      '#06b6d4': 'Cyan',
      '#0ea5e9': 'Sky',
      '#3b82f6': 'Blue',
      '#6366f1': 'Indigo',
      '#8b5cf6': 'Violet',
      '#a855f7': 'Purple',
      '#d946ef': 'Fuchsia',
      '#ec4899': 'Pink',
      '#f43f5e': 'Rose',
    }

    return colorMap[hexColor.toLowerCase()] || 'Custom'
  }

  /**
   * Get contrast color for text on colored background
   */
  static getContrastColor(hexColor: string): string {
    // Remove # if present
    const color = hexColor.replace('#', '')

    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16)
    const g = parseInt(color.substr(2, 2), 16)
    const b = parseInt(color.substr(4, 2), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Return white text on dark backgrounds, black text on light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  /**
   * Transform raw database response to MilestoneLabel interface
   */
  static fromDatabase(data: any): MilestoneLabel {
    return {
      id: data.id,
      milestone_id: data.milestone_id,
      name: data.name,
      color: data.color
    }
  }

  /**
   * Transform MilestoneLabel interface to database format
   */
  static toDatabase(label: Partial<MilestoneLabel>): any {
    return {
      id: label.id,
      milestone_id: label.milestone_id,
      name: label.name,
      color: label.color
    }
  }

  /**
   * Validate hex color format
   */
  private static isValidHexColor(color: string): boolean {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    return hexRegex.test(color)
  }
}


