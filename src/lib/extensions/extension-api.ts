'use client'

import React from 'react'
import ReactDOM from 'react-dom'

// Extension API Types
export interface ExtensionManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  permissions: ExtensionPermission[]
  entryPoints: ExtensionEntryPoint[]
  dependencies?: string[]
  minVersion?: string
  maxVersion?: string
}

export interface ExtensionPermission {
  type: 'read' | 'write' | 'network' | 'storage' | 'notifications'
  resource: string
  description: string
}

export interface ExtensionEntryPoint {
  type: 'card' | 'board' | 'project' | 'global'
  component: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  priority?: number
}

export interface ExtensionContext {
  projectId?: string
  cardId?: string
  boardId?: string
  userId: string
  organizationId?: string
  permissions: string[]
  api: ExtensionAPI
}

export interface ExtensionAPI {
  // Data access
  getProjects: () => Promise<any[]>
  getProject: (id: string) => Promise<any>
  getTasks: (projectId?: string) => Promise<any[]>
  getTask: (id: string) => Promise<any>
  
  // Data modification
  createTask: (data: any) => Promise<any>
  updateTask: (id: string, data: any) => Promise<any>
  deleteTask: (id: string) => Promise<boolean>
  
  // UI interactions
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
  showModal: (component: React.ComponentType, props?: any) => void
  closeModal: () => void
  
  // Storage
  getStorage: (key: string) => Promise<any>
  setStorage: (key: string, value: any) => Promise<void>
  removeStorage: (key: string) => Promise<void>
  
  // Network requests
  request: (url: string, options?: RequestInit) => Promise<Response>
  
  // Events
  on: (event: string, callback: Function) => void
  off: (event: string, callback: Function) => void
  emit: (event: string, data?: any) => void
  
  // Utilities
  log: (message: string, level?: 'info' | 'warn' | 'error') => void
  formatDate: (date: Date | string) => string
  formatDuration: (milliseconds: number) => string
}

export interface ExtensionComponent {
  id: string
  component: React.ComponentType<any>
  manifest: ExtensionManifest
  context: ExtensionContext
}

export interface ExtensionManager {
  loadExtension: (manifest: ExtensionManifest, code: string) => Promise<ExtensionComponent>
  unloadExtension: (id: string) => Promise<void>
  getExtension: (id: string) => ExtensionComponent | null
  listExtensions: () => ExtensionComponent[]
  enableExtension: (id: string) => Promise<void>
  disableExtension: (id: string) => Promise<void>
  isEnabled: (id: string) => boolean
}

// Extension Sandbox
class ExtensionSandbox {
  private context: ExtensionContext
  private permissions: Set<string>
  private storage: Map<string, any> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(context: ExtensionContext) {
    this.context = context
    this.permissions = new Set(context.permissions)
  }

  // Permission checking
  private checkPermission(permission: string): boolean {
    return this.permissions.has(permission) || this.permissions.has('*')
  }

  // Data access methods
  async getProjects(): Promise<any[]> {
    if (!this.checkPermission('read:projects')) {
      throw new Error('Permission denied: read:projects')
    }
    
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      return data.success ? data.data : []
    } catch (error) {
      this.log(`Failed to fetch projects: ${error}`, 'error')
      return []
    }
  }

  async getProject(id: string): Promise<any> {
    if (!this.checkPermission('read:projects')) {
      throw new Error('Permission denied: read:projects')
    }
    
    try {
      const response = await fetch(`/api/projects/${id}`)
      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      this.log(`Failed to fetch project ${id}: ${error}`, 'error')
      return null
    }
  }

  async getTasks(projectId?: string): Promise<any[]> {
    if (!this.checkPermission('read:tasks')) {
      throw new Error('Permission denied: read:tasks')
    }
    
    try {
      const url = projectId ? `/api/tasks?project=${projectId}` : '/api/tasks'
      const response = await fetch(url)
      const data = await response.json()
      return data.success ? data.data : []
    } catch (error) {
      this.log(`Failed to fetch tasks: ${error}`, 'error')
      return []
    }
  }

  async getTask(id: string): Promise<any> {
    if (!this.checkPermission('read:tasks')) {
      throw new Error('Permission denied: read:tasks')
    }
    
    try {
      const response = await fetch(`/api/tasks/${id}`)
      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      this.log(`Failed to fetch task ${id}: ${error}`, 'error')
      return null
    }
  }

  // Data modification methods
  async createTask(data: any): Promise<any> {
    if (!this.checkPermission('write:tasks')) {
      throw new Error('Permission denied: write:tasks')
    }
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      this.log(`Failed to create task: ${error}`, 'error')
      throw error
    }
  }

  async updateTask(id: string, data: any): Promise<any> {
    if (!this.checkPermission('write:tasks')) {
      throw new Error('Permission denied: write:tasks')
    }
    
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      this.log(`Failed to update task ${id}: ${error}`, 'error')
      throw error
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    if (!this.checkPermission('write:tasks')) {
      throw new Error('Permission denied: write:tasks')
    }
    
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      this.log(`Failed to delete task ${id}: ${error}`, 'error')
      return false
    }
  }

  // UI interaction methods
  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    if (!this.checkPermission('ui:toast')) {
      this.log('Permission denied: ui:toast', 'warn')
      return
    }
    
    // Emit event for toast system to handle
    this.emit('extension:toast', { message, type })
  }

  showModal(component: React.ComponentType, props?: any): void {
    if (!this.checkPermission('ui:modal')) {
      this.log('Permission denied: ui:modal', 'warn')
      return
    }
    
    this.emit('extension:modal', { component, props })
  }

  closeModal(): void {
    if (!this.checkPermission('ui:modal')) {
      this.log('Permission denied: ui:modal', 'warn')
      return
    }
    
    this.emit('extension:modal:close')
  }

  // Storage methods
  async getStorage(key: string): Promise<any> {
    if (!this.checkPermission('storage:read')) {
      throw new Error('Permission denied: storage:read')
    }
    
    return this.storage.get(key)
  }

  async setStorage(key: string, value: any): Promise<void> {
    if (!this.checkPermission('storage:write')) {
      throw new Error('Permission denied: storage:write')
    }
    
    this.storage.set(key, value)
  }

  async removeStorage(key: string): Promise<void> {
    if (!this.checkPermission('storage:write')) {
      throw new Error('Permission denied: storage:write')
    }
    
    this.storage.delete(key)
  }

  // Network request method
  async request(url: string, options?: RequestInit): Promise<Response> {
    if (!this.checkPermission('network:request')) {
      throw new Error('Permission denied: network:request')
    }
    
    // Validate URL for security
    if (!url.startsWith('https://') && !url.startsWith('/api/')) {
      throw new Error('Invalid URL: only HTTPS and API endpoints allowed')
    }
    
    return fetch(url, options)
  }

  // Event methods
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          this.log(`Event listener error for ${event}: ${error}`, 'error')
        }
      })
    }
  }

  // Utility methods
  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString()
    console.log(`[Extension ${this.context.projectId || 'global'}] ${timestamp} [${level.toUpperCase()}] ${message}`)
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  // Create API object
  createAPI(): ExtensionAPI {
    return {
      getProjects: () => this.getProjects(),
      getProject: (id: string) => this.getProject(id),
      getTasks: (projectId?: string) => this.getTasks(projectId),
      getTask: (id: string) => this.getTask(id),
      createTask: (data: any) => this.createTask(data),
      updateTask: (id: string, data: any) => this.updateTask(id, data),
      deleteTask: (id: string) => this.deleteTask(id),
      showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => this.showToast(message, type),
      showModal: (component: React.ComponentType, props?: any) => this.showModal(component, props),
      closeModal: () => this.closeModal(),
      getStorage: (key: string) => this.getStorage(key),
      setStorage: (key: string, value: any) => this.setStorage(key, value),
      removeStorage: (key: string) => this.removeStorage(key),
      request: (url: string, options?: RequestInit) => this.request(url, options),
      on: (event: string, callback: Function) => this.on(event, callback),
      off: (event: string, callback: Function) => this.off(event, callback),
      emit: (event: string, data?: any) => this.emit(event, data),
      log: (message: string, level?: 'info' | 'warn' | 'error') => this.log(message, level),
      formatDate: (date: Date | string) => this.formatDate(date),
      formatDuration: (milliseconds: number) => this.formatDuration(milliseconds)
    }
  }
}

// Extension Manager Implementation
class ExtensionManagerImpl implements ExtensionManager {
  private extensions: Map<string, ExtensionComponent> = new Map()
  private enabledExtensions: Set<string> = new Set()
  private sandboxes: Map<string, ExtensionSandbox> = new Map()

  async loadExtension(manifest: ExtensionManifest, code: string): Promise<ExtensionComponent> {
    try {
      // Validate manifest
      this.validateManifest(manifest)
      
      // Create sandbox
      const context: ExtensionContext = {
        projectId: undefined, // Will be set when component is rendered
        userId: 'current-user', // Will be set from auth context
        permissions: manifest.permissions.map(p => `${p.type}:${p.resource}`),
        api: {} as ExtensionAPI // Will be set after sandbox creation
      }
      
      const sandbox = new ExtensionSandbox(context)
      const api = sandbox.createAPI()
      context.api = api
      
      // Store sandbox
      this.sandboxes.set(manifest.id, sandbox)
      
      // Execute extension code in sandbox
      const extensionModule = this.executeExtensionCode(code, api)
      
      // Create extension component
      const extensionComponent: ExtensionComponent = {
        id: manifest.id,
        component: extensionModule.default || extensionModule,
        manifest,
        context
      }
      
      // Store extension
      this.extensions.set(manifest.id, extensionComponent)
      
      // Enable by default
      this.enabledExtensions.add(manifest.id)
      
      return extensionComponent
      
    } catch (error) {
      throw new Error(`Failed to load extension ${manifest.id}: ${error}`)
    }
  }

  async unloadExtension(id: string): Promise<void> {
    this.extensions.delete(id)
    this.enabledExtensions.delete(id)
    this.sandboxes.delete(id)
  }

  getExtension(id: string): ExtensionComponent | null {
    return this.extensions.get(id) || null
  }

  listExtensions(): ExtensionComponent[] {
    return Array.from(this.extensions.values())
  }

  async enableExtension(id: string): Promise<void> {
    if (this.extensions.has(id)) {
      this.enabledExtensions.add(id)
    } else {
      throw new Error(`Extension ${id} not found`)
    }
  }

  async disableExtension(id: string): Promise<void> {
    this.enabledExtensions.delete(id)
  }

  isEnabled(id: string): boolean {
    return this.enabledExtensions.has(id)
  }

  private validateManifest(manifest: ExtensionManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Invalid manifest: missing required fields')
    }
    
    if (!manifest.entryPoints || manifest.entryPoints.length === 0) {
      throw new Error('Invalid manifest: no entry points defined')
    }
  }

  private executeExtensionCode(code: string, api: ExtensionAPI): any {
    // Create a safe execution environment
    const safeGlobals = {
      console: {
        log: (message: string) => api.log(message, 'info'),
        warn: (message: string) => api.log(message, 'warn'),
        error: (message: string) => api.log(message, 'error')
      },
      fetch: api.request,
      setTimeout: (callback: Function, delay: number) => {
        return setTimeout(() => {
          try {
            callback()
          } catch (error) {
            api.log(`Extension error: ${error}`, 'error')
          }
        }, delay)
      },
      setInterval: (callback: Function, delay: number) => {
        return setInterval(() => {
          try {
            callback()
          } catch (error) {
            api.log(`Extension error: ${error}`, 'error')
          }
        }, delay)
      }
    }
    
    // Create function with safe environment
    const extensionFunction = new Function(
      'api',
      'React',
      'ReactDOM',
      'exports',
      'module',
      `
      // Extension code execution
      ${code}
      
      // Return the module exports
      return module.exports || exports;
      `
    )
    
    // Mock module system
    const exports = {}
    const moduleObject = { exports: {} }
    
    // Execute extension
    return extensionFunction.call(safeGlobals, api, React, ReactDOM, exports, moduleObject)
  }
}

// Export singleton instance
export const extensionManager = new ExtensionManagerImpl()

// Extension Registry
export class ExtensionRegistry {
  private static instance: ExtensionRegistry
  private registry: Map<string, { manifest: ExtensionManifest; code: string }> = new Map()

  static getInstance(): ExtensionRegistry {
    if (!ExtensionRegistry.instance) {
      ExtensionRegistry.instance = new ExtensionRegistry()
    }
    return ExtensionRegistry.instance
  }

  register(id: string, manifest: ExtensionManifest, code: string): void {
    this.registry.set(id, { manifest, code })
  }

  get(id: string): { manifest: ExtensionManifest; code: string } | null {
    return this.registry.get(id) || null
  }

  list(): ExtensionManifest[] {
    return Array.from(this.registry.values()).map(item => item.manifest)
  }

  remove(id: string): void {
    this.registry.delete(id)
  }
}

export const extensionRegistry = ExtensionRegistry.getInstance()
