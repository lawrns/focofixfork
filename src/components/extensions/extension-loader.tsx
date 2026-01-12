'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  Play, 
  Pause,
  Trash2,
  Download,
  Upload
} from 'lucide-react'
import { 
  ExtensionComponent, 
  ExtensionManifest, 
  extensionManager, 
  extensionRegistry 
} from '@/lib/extensions/extension-api'

interface ExtensionLoaderProps {
  projectId?: string
  cardId?: string
  boardId?: string
  userId: string
  organizationId?: string
  onExtensionLoad?: (extension: ExtensionComponent) => void
  onExtensionError?: (error: string) => void
}

export function ExtensionLoader({
  projectId,
  cardId,
  boardId,
  userId,
  organizationId,
  onExtensionLoad,
  onExtensionError
}: ExtensionLoaderProps) {
  const [extensions, setExtensions] = useState<ExtensionComponent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Load all extensions
  const loadExtensions = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const loadedExtensions = extensionManager.listExtensions()
      setExtensions(loadedExtensions)
    } catch (err) {
      setError(`Failed to load extensions: ${err}`)
      onExtensionError?.(`Failed to load extensions: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [onExtensionError])

  // Load extension from file
  const loadExtensionFromFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setUploadProgress(0)
    
    try {
      const content = await file.text()
      setUploadProgress(25)
      
      // Parse manifest and code
      const lines = content.split('\n')
      let manifestStart = -1
      let manifestEnd = -1
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '// MANIFEST_START') {
          manifestStart = i + 1
        } else if (lines[i].trim() === '// MANIFEST_END') {
          manifestEnd = i
          break
        }
      }
      
      if (manifestStart === -1 || manifestEnd === -1) {
        throw new Error('Invalid extension file: missing manifest')
      }
      
      const manifestJson = lines.slice(manifestStart, manifestEnd).join('\n')
      const manifest: ExtensionManifest = JSON.parse(manifestJson)
      setUploadProgress(50)
      
      const code = lines.slice(manifestEnd + 1).join('\n')
      setUploadProgress(75)
      
      // Load extension
      const extension = await extensionManager.loadExtension(manifest, code)
      setUploadProgress(100)
      
      // Update extensions list
      await loadExtensions()
      
      onExtensionLoad?.(extension)
      
    } catch (err) {
      setError(`Failed to load extension: ${err}`)
      onExtensionError?.(`Failed to load extension: ${err}`)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }, [loadExtensions, onExtensionLoad, onExtensionError])

  // Toggle extension
  const toggleExtension = useCallback(async (id: string) => {
    try {
      if (extensionManager.isEnabled(id)) {
        await extensionManager.disableExtension(id)
      } else {
        await extensionManager.enableExtension(id)
      }
      
      // Reload extensions to update status
      await loadExtensions()
      
    } catch (err) {
      setError(`Failed to toggle extension: ${err}`)
      onExtensionError?.(`Failed to toggle extension: ${err}`)
    }
  }, [loadExtensions, onExtensionError])

  // Remove extension
  const removeExtension = useCallback(async (id: string) => {
    try {
      await extensionManager.unloadExtension(id)
      await loadExtensions()
    } catch (err) {
      setError(`Failed to remove extension: ${err}`)
      onExtensionError?.(`Failed to remove extension: ${err}`)
    }
  }, [loadExtensions, onExtensionError])

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      loadExtensionFromFile(file)
    }
  }, [loadExtensionFromFile])

  // Load extensions on mount
  useEffect(() => {
    loadExtensions()
  }, [loadExtensions])

  // Render extension component
  const renderExtension = useCallback((extension: ExtensionComponent): ReactNode => {
    const { component: ExtensionComponent, manifest, context } = extension
    
    // Update context with current props
    const updatedContext = {
      ...context,
      projectId,
      cardId,
      boardId,
      userId,
      organizationId
    }
    
    try {
      return (
        <ExtensionComponent
          context={updatedContext}
          api={updatedContext.api}
        />
      )
    } catch (err) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Extension {manifest.name} failed to render: {err}
          </AlertDescription>
        </Alert>
      )
    }
  }, [projectId, cardId, boardId, userId, organizationId])

  if (loading && uploadProgress === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading extensions...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Extension Manager</h3>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".js,.ts,.jsx,.tsx"
              onChange={handleFileUpload}
              className="hidden"
              id="extension-upload"
            />
            <label htmlFor="extension-upload">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Upload Extension
                </span>
              </Button>
            </label>
          </div>
        </div>
        
        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Uploading extension...</div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Extensions List */}
      <div className="space-y-3">
        {extensions.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No extensions loaded</p>
              <p className="text-sm">Upload an extension file to get started</p>
            </div>
          </Card>
        ) : (
          extensions.map((extension) => (
            <Card key={extension.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {extension.manifest.icon && (
                      <img 
                        src={extension.manifest.icon} 
                        alt={extension.manifest.name}
                        className="w-6 h-6 rounded"
                      />
                    )}
                    <h4 className="font-semibold">{extension.manifest.name}</h4>
                    <Badge variant="secondary">{extension.manifest.version}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {extensionManager.isEnabled(extension.id) ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Pause className="w-3 h-3" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExtension(extension.id)}
                  >
                    {extensionManager.isEnabled(extension.id) ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Enable
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeExtension(extension.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {extension.manifest.description}
              </p>
              
              <div className="text-xs text-gray-500 mb-3">
                <div>Author: {extension.manifest.author}</div>
                <div>Permissions: {extension.manifest.permissions.map(p => p.type).join(', ')}</div>
              </div>
              
              {/* Render extension component if enabled */}
              {extensionManager.isEnabled(extension.id) && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Extension Output:</div>
                  <div className="bg-gray-50 rounded p-3">
                    {renderExtension(extension)}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
