export interface Label {
  id: string
  name: string
  color: string
  project_id: string
  created_at: string
  updated_at: string
}

export interface TaskLabel {
  task_id: string
  label_id: string
  created_at: string
}

// Predefined colors matching Trello's palette
export const LABEL_COLORS = [
  { id: 'red', name: 'Red', value: '#e74c3c' },
  { id: 'orange', name: 'Orange', value: '#f39c12' },
  { id: 'yellow', name: 'Yellow', value: '#f1c40f' },
  { id: 'green', name: 'Green', value: '#27ae60' },
  { id: 'blue', name: 'Blue', value: '#3498db' },
  { id: 'purple', name: 'Purple', value: '#9b59b6' },
  { id: 'pink', name: 'Pink', value: '#e91e63' },
  { id: 'gray', name: 'Gray', value: '#95a5a6' },
  { id: 'slate', name: 'Slate', value: '#34495e' },
  { id: 'indigo', name: 'Indigo', value: '#3f51b5' }
]

export function getLabelColorById(colorId: string): string {
  const color = LABEL_COLORS.find(c => c.id === colorId)
  return color?.value || '#95a5a6' // Default to gray
}

export function getLabelColorName(colorId: string): string {
  const color = LABEL_COLORS.find(c => c.id === colorId)
  return color?.name || 'Gray'
}

export function validateLabelName(name: string): string | null {
  if (!name.trim()) {
    return 'Label name is required'
  }
  if (name.length > 50) {
    return 'Label name must be less than 50 characters'
  }
  return null
}

export function validateLabelColor(color: string): boolean {
  return LABEL_COLORS.some(c => c.id === color)
}
