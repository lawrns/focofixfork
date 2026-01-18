'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Copy,
  Users,
  Settings,
  Eye,
  Pencil,
  UserCheck,
  Crown,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Building,
  Folder,
  Target,
  CheckSquare,
  BarChart
} from 'lucide-react'

// Permission categories and their permissions
export const PERMISSION_CATEGORIES = {
  organization: {
    name: 'Organization',
    icon: Building,
    permissions: {
      view_organization: 'View organization details',
      edit_organization: 'Edit organization settings',
      delete_organization: 'Delete organization',
      manage_billing: 'Manage billing and subscriptions',
      view_audit_logs: 'View audit logs'
    }
  },
  projects: {
    name: 'Projects',
    icon: Folder,
    permissions: {
      view_projects: 'View all projects',
      create_projects: 'Create new projects',
      edit_projects: 'Edit project details',
      delete_projects: 'Delete projects',
      manage_project_members: 'Manage project team members',
      view_project_analytics: 'View project analytics'
    }
  },
  milestones: {
    name: 'Milestones',
    icon: Target,
    permissions: {
      view_milestones: 'View all milestones',
      create_milestones: 'Create new milestones',
      edit_milestones: 'Edit milestone details',
      delete_milestones: 'Delete milestones',
      assign_milestones: 'Assign milestones to team members',
      complete_milestones: 'Mark milestones as complete'
    }
  },
  tasks: {
    name: 'Tasks',
    icon: CheckSquare,
    permissions: {
      view_tasks: 'View all tasks',
      create_tasks: 'Create new tasks',
      edit_tasks: 'Edit task details',
      delete_tasks: 'Delete tasks',
      assign_tasks: 'Assign tasks to team members',
      complete_tasks: 'Mark tasks as complete'
    }
  },
  team: {
    name: 'Team Management',
    icon: Users,
    permissions: {
      view_team: 'View team members',
      invite_members: 'Invite new team members',
      remove_members: 'Remove team members',
      manage_roles: 'Assign and change member roles',
      manage_permissions: 'Create and edit custom roles'
    }
  },
  reports: {
    name: 'Reports & Analytics',
    icon: BarChart,
    permissions: {
      view_reports: 'View organization reports',
      export_data: 'Export data and reports',
      view_analytics: 'Access advanced analytics',
      create_custom_reports: 'Create custom reports'
    }
  }
} as const

export interface Permission {
  id: string
  name: string
  description?: string
  category: keyof typeof PERMISSION_CATEGORIES
  permission: string
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  is_default?: boolean
  is_system?: boolean
  created_at: string
  updated_at: string
}

export interface PermissionTemplate {
  id: string
  name: string
  description: string
  permissions: Permission[]
  is_recommended?: boolean
}

// Pre-defined role templates
const ROLE_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'director',
    name: 'Director',
    description: 'Full access to all organization features and settings',
    is_recommended: true,
    permissions: Object.values(PERMISSION_CATEGORIES).flatMap(category =>
      Object.keys(category.permissions).map(perm => ({
        id: `${category.name.toLowerCase()}_${perm}`,
        name: category.permissions[perm as keyof typeof category.permissions],
        category: category.name.toLowerCase() as keyof typeof PERMISSION_CATEGORIES,
        permission: perm
      }))
    )
  },
  {
    id: 'lead',
    name: 'Lead',
    description: 'Manage projects and team, with limited organization settings',
    permissions: [
      // Organization - limited
      { id: 'org_view_organization', name: 'View organization details', category: 'organization', permission: 'view_organization' },
      // Projects - full
      ...Object.keys(PERMISSION_CATEGORIES.projects.permissions).map(perm => ({
        id: `projects_${perm}`,
        name: PERMISSION_CATEGORIES.projects.permissions[perm as keyof typeof PERMISSION_CATEGORIES.projects.permissions],
        category: 'projects' as const,
        permission: perm
      })),
      // Milestones - full
      ...Object.keys(PERMISSION_CATEGORIES.milestones.permissions).map(perm => ({
        id: `milestones_${perm}`,
        name: PERMISSION_CATEGORIES.milestones.permissions[perm as keyof typeof PERMISSION_CATEGORIES.milestones.permissions],
        category: 'milestones' as const,
        permission: perm
      })),
      // Tasks - full
      ...Object.keys(PERMISSION_CATEGORIES.tasks.permissions).map(perm => ({
        id: `tasks_${perm}`,
        name: PERMISSION_CATEGORIES.tasks.permissions[perm as keyof typeof PERMISSION_CATEGORIES.tasks.permissions],
        category: 'tasks' as const,
        permission: perm
      })),
      // Team - manage members only
      { id: 'team_view_team', name: 'View team members', category: 'team', permission: 'view_team' },
      { id: 'team_invite_members', name: 'Invite new team members', category: 'team', permission: 'invite_members' },
      { id: 'team_remove_members', name: 'Remove team members', category: 'team', permission: 'remove_members' },
      { id: 'team_manage_roles', name: 'Assign and change member roles', category: 'team', permission: 'manage_roles' },
      // Reports - view only
      { id: 'reports_view_reports', name: 'View organization reports', category: 'reports', permission: 'view_reports' },
      { id: 'reports_export_data', name: 'Export data and reports', category: 'reports', permission: 'export_data' }
    ]
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Standard team member with project and task access',
    permissions: [
      // Organization - view only
      { id: 'org_view_organization', name: 'View organization details', category: 'organization', permission: 'view_organization' },
      // Projects - view and limited edit
      { id: 'projects_view_projects', name: 'View all projects', category: 'projects', permission: 'view_projects' },
      { id: 'projects_create_projects', name: 'Create new projects', category: 'projects', permission: 'create_projects' },
      { id: 'projects_edit_projects', name: 'Edit project details', category: 'projects', permission: 'edit_projects' },
      // Milestones - full access to assigned
      { id: 'milestones_view_milestones', name: 'View all milestones', category: 'milestones', permission: 'view_milestones' },
      { id: 'milestones_create_milestones', name: 'Create new milestones', category: 'milestones', permission: 'create_milestones' },
      { id: 'milestones_edit_milestones', name: 'Edit milestone details', category: 'milestones', permission: 'edit_milestones' },
      { id: 'milestones_assign_milestones', name: 'Assign milestones to team members', category: 'milestones', permission: 'assign_milestones' },
      { id: 'milestones_complete_milestones', name: 'Mark milestones as complete', category: 'milestones', permission: 'complete_milestones' },
      // Tasks - full access
      ...Object.keys(PERMISSION_CATEGORIES.tasks.permissions).map(perm => ({
        id: `tasks_${perm}`,
        name: PERMISSION_CATEGORIES.tasks.permissions[perm as keyof typeof PERMISSION_CATEGORIES.tasks.permissions],
        category: 'tasks' as const,
        permission: perm
      })),
      // Team - view only
      { id: 'team_view_team', name: 'View team members', category: 'team', permission: 'view_team' },
      // Reports - limited
      { id: 'reports_view_reports', name: 'View organization reports', category: 'reports', permission: 'view_reports' }
    ]
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to projects and team information',
    permissions: [
      // Organization - view only
      { id: 'org_view_organization', name: 'View organization details', category: 'organization', permission: 'view_organization' },
      // Projects - view only
      { id: 'projects_view_projects', name: 'View all projects', category: 'projects', permission: 'view_projects' },
      // Milestones - view only
      { id: 'milestones_view_milestones', name: 'View all milestones', category: 'milestones', permission: 'view_milestones' },
      // Tasks - view only
      { id: 'tasks_view_tasks', name: 'View all tasks', category: 'tasks', permission: 'view_tasks' },
      // Team - view only
      { id: 'team_view_team', name: 'View team members', category: 'team', permission: 'view_team' },
      // Reports - view only
      { id: 'reports_view_reports', name: 'View organization reports', category: 'reports', permission: 'view_reports' }
    ]
  }
]

interface PermissionsManagerProps {
  workspaceId: string
  currentUserRole?: string
  className?: string
}

export default function PermissionsManager({
  workspaceId,
  currentUserRole = 'member',
  className
}: PermissionsManagerProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [showEditRole, setShowEditRole] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // New role form state
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  useEffect(() => {
    loadRoles()
  }, [workspaceId])

  const loadRoles = async () => {
    try {
      // TODO: Load roles from API
      // For now, use template roles as defaults
      const defaultRoles: Role[] = ROLE_TEMPLATES.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        permissions: template.permissions,
        is_default: true,
        is_system: ['director', 'lead', 'member'].includes(template.id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      setRoles(defaultRoles)
      setSelectedRole(defaultRoles[0])
    } catch (error) {
      console.error('Failed to load roles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return

    const newRole: Role = {
      id: `custom_${Date.now()}`,
      name: newRoleName,
      description: newRoleDescription,
      permissions: selectedPermissions,
      is_default: false,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setRoles(prev => [...prev, newRole])
    setNewRoleName('')
    setNewRoleDescription('')
    setSelectedPermissions([])
    setSelectedTemplate('')
    setShowCreateRole(false)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setNewRoleName(role.name)
    setNewRoleDescription(role.description || '')
    setSelectedPermissions(role.permissions)
    setShowEditRole(true)
  }

  const handleUpdateRole = () => {
    if (!editingRole || !newRoleName.trim()) return

    const updatedRole: Role = {
      ...editingRole,
      name: newRoleName,
      description: newRoleDescription,
      permissions: selectedPermissions,
      updated_at: new Date().toISOString()
    }

    setRoles(prev => prev.map(r => r.id === editingRole.id ? updatedRole : r))
    setSelectedRole(updatedRole)
    setEditingRole(null)
    setNewRoleName('')
    setNewRoleDescription('')
    setSelectedPermissions([])
    setShowEditRole(false)
  }

  const handleDeleteRole = (roleId: string) => {
    if (roles.find(r => r.id === roleId)?.is_system) {
      alert('Cannot delete system roles')
      return
    }

    setRoles(prev => prev.filter(r => r.id !== roleId))
    if (selectedRole?.id === roleId) {
      setSelectedRole(roles[0] || null)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = ROLE_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setSelectedPermissions(template.permissions)
      setSelectedTemplate(templateId)
    }
  }

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions(prev =>
      prev.some(p => p.id === permission.id)
        ? prev.filter(p => p.id !== permission.id)
        : [...prev, permission]
    )
  }

  const canManagePermissions = currentUserRole === 'director'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Role & Permissions Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure roles and permissions for your organization members
          </p>
        </div>

        {canManagePermissions && (
          <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Custom Role</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      placeholder="e.g., Project Manager"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      placeholder="Describe what this role can do..."
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Start from Template (Optional)</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template to start with" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_TEMPLATES.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              {template.name}
                              {template.is_recommended && (
                                <Badge variant="secondary" className="text-xs">Recommended</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Permissions</Label>

                  <Tabs defaultValue="organization" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                        const IconComponent = category.icon
                        return (
                          <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                            <IconComponent className="w-4 h-4" />
                            <span className="hidden sm:inline">{category.name}</span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>

                    {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                      <TabsContent key={categoryKey} value={categoryKey} className="space-y-3">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {Object.entries(category.permissions).map(([permKey, permName]) => {
                            const permission: Permission = {
                              id: `${categoryKey}_${permKey}`,
                              name: permName,
                              category: categoryKey as keyof typeof PERMISSION_CATEGORIES,
                              permission: permKey
                            }

                            const isSelected = selectedPermissions.some(p => p.id === permission.id)

                            return (
                              <div key={permKey} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <span className="font-medium">{permName}</span>
                                </div>
                                <Switch
                                  checked={isSelected}
                                  onCheckedChange={() => togglePermission(permission)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateRole(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateRole}
                    disabled={!newRoleName.trim()}
                  >
                    <Save className="w-4 h-4" />
                    Create Role
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <AnimatePresence>
                {roles.map((role) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRole?.id === role.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{role.name}</span>
                          {role.is_system && (
                            <Badge variant="outline" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {role.description}
                          </p>
                        )}
                      </div>

                      {canManagePermissions && !role.is_system && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditRole(role)
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRole(role.id)
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Role Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedRole ? selectedRole.name : 'Select a Role'}
                </CardTitle>
                {selectedRole?.description && (
                  <p className="text-muted-foreground mt-1">
                    {selectedRole.description}
                  </p>
                )}
              </div>

              {selectedRole && canManagePermissions && !selectedRole.is_system && (
                <Button
                  variant="outline"
                  onClick={() => handleEditRole(selectedRole)}
                >
                  <Edit className="w-4 h-4" />
                  Edit Role
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {selectedRole ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {selectedRole.permissions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Permissions
                    </div>
                  </div>

                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.keys(PERMISSION_CATEGORIES).filter(cat =>
                        selectedRole.permissions.some(p => p.category === cat)
                      ).length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Categories
                    </div>
                  </div>

                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {roles.filter(r => !r.is_system).length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Custom Roles
                    </div>
                  </div>

                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedRole.is_system ? 'System' : 'Custom'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Role Type
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Permissions by Category</h3>

                  {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                    const categoryPermissions = selectedRole.permissions.filter(
                      p => p.category === categoryKey
                    )

                    if (categoryPermissions.length === 0) return null

                    const IconComponent = category.icon

                    return (
                      <div key={categoryKey} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <IconComponent className="w-5 h-5 text-primary" />
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="secondary">
                            {categoryPermissions.length} permissions
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categoryPermissions.map((permission) => (
                            <div key={permission.id} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm">{permission.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Role Selected</h3>
                <p className="text-muted-foreground">
                  Select a role from the list to view its permissions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={showEditRole} onOpenChange={setShowEditRole}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input
                  id="edit-role-name"
                  placeholder="e.g., Project Manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role-description">Description</Label>
                <Textarea
                  id="edit-role-description"
                  placeholder="Describe what this role can do..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Permissions</Label>

              <Tabs defaultValue="organization" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                    const IconComponent = category.icon
                    return (
                      <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                        <IconComponent className="w-4 h-4" />
                        <span className="hidden sm:inline">{category.name}</span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                  <TabsContent key={categoryKey} value={categoryKey} className="space-y-3">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Object.entries(category.permissions).map(([permKey, permName]) => {
                        const permission: Permission = {
                          id: `${categoryKey}_${permKey}`,
                          name: permName,
                          category: categoryKey as keyof typeof PERMISSION_CATEGORIES,
                          permission: permKey
                        }

                        const isSelected = selectedPermissions.some(p => p.id === permission.id)

                        return (
                          <div key={permKey} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <span className="font-medium">{permName}</span>
                            </div>
                            <Switch
                              checked={isSelected}
                              onCheckedChange={() => togglePermission(permission)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowEditRole(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={!newRoleName.trim()}
              >
                <Save className="w-4 h-4" />
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
