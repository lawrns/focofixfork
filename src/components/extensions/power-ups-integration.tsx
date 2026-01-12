'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Download, 
  Play, 
  Pause, 
  Trash2, 
  Info,
  CheckCircle,
  AlertCircle,
  Star,
  Zap
} from 'lucide-react'
import { 
  extensionManager, 
  extensionRegistry 
} from '@/lib/extensions/extension-api'
import { 
  powerUpsRegistry, 
  BuiltInPowerUp 
} from '@/lib/power-ups/power-ups-registry'

interface PowerUpsIntegrationProps {
  projectId?: string
  userId: string
  organizationId?: string
  onPowerUpInstall?: (powerUp: BuiltInPowerUp) => void
  onPowerUpUninstall?: (powerUp: BuiltInPowerUp) => void
}

export function PowerUpsIntegration({
  projectId,
  userId,
  organizationId,
  onPowerUpInstall,
  onPowerUpUninstall
}: PowerUpsIntegrationProps) {
  const [powerUps, setPowerUps] = useState<BuiltInPowerUp[]>([])
  const [installedPowerUps, setInstalledPowerUps] = useState<BuiltInPowerUp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed'>('marketplace')

  // Load power-ups
  const loadPowerUps = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const allPowerUps = powerUpsRegistry.getAllPowerUps()
      const installed = powerUpsRegistry.getInstalledPowerUps()
      
      setPowerUps(allPowerUps)
      setInstalledPowerUps(installed)
    } catch (err) {
      setError(`Failed to load power-ups: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Install power-up
  const handleInstall = useCallback(async (powerUp: BuiltInPowerUp) => {
    try {
      // Load the power-up into the extension manager
      const extension = await extensionManager.loadExtension(
        powerUp.manifest,
        powerUp.code
      )
      
      // Mark as installed in registry
      powerUpsRegistry.markAsInstalled(powerUp.manifest.id)
      
      // Update local state
      setInstalledPowerUps(prev => [...prev, powerUp])
      
      onPowerUpInstall?.(powerUp)
      
    } catch (err) {
      setError(`Failed to install ${powerUp.manifest.name}: ${err}`)
    }
  }, [onPowerUpInstall])

  // Uninstall power-up
  const handleUninstall = useCallback(async (powerUp: BuiltInPowerUp) => {
    try {
      // Unload from extension manager
      await extensionManager.unloadExtension(powerUp.manifest.id)
      
      // Mark as uninstalled in registry
      powerUpsRegistry.markAsUninstalled(powerUp.manifest.id)
      
      // Update local state
      setInstalledPowerUps(prev => prev.filter(p => p.manifest.id !== powerUp.manifest.id))
      
      onPowerUpUninstall?.(powerUp)
      
    } catch (err) {
      setError(`Failed to uninstall ${powerUp.manifest.name}: ${err}`)
    }
  }, [onPowerUpUninstall])

  // Enable/disable power-up
  const handleToggle = useCallback(async (powerUp: BuiltInPowerUp) => {
    try {
      if (powerUpsRegistry.getInstalledPowerUps().find(p => p.manifest.id === powerUp.manifest.id)) {
        // Disable
        await extensionManager.disableExtension(powerUp.manifest.id)
      } else {
        // Enable
        await extensionManager.enableExtension(powerUp.manifest.id)
      }
      
      // Reload installed power-ups
      const installed = powerUpsRegistry.getInstalledPowerUps()
      setInstalledPowerUps(installed)
      
    } catch (err) {
      setError(`Failed to toggle ${powerUp.manifest.name}: ${err}`)
    }
  }, [])

  // Load power-ups on mount
  useEffect(() => {
    loadPowerUps()
  }, [loadPowerUps])

  // Get category color
  const getCategoryColor = (category: string): string => {
    const colors = {
      development: 'bg-blue-100 text-blue-800',
      productivity: 'bg-green-100 text-green-800',
      customization: 'bg-purple-100 text-purple-800',
      communication: 'bg-orange-100 text-orange-800',
      analytics: 'bg-pink-100 text-pink-800',
      integration: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Get category icon
  const getCategoryIcon = (category: string): string => {
    const icons = {
      development: '💻',
      productivity: '⚡',
      customization: '🎨',
      communication: '💬',
      analytics: '📊',
      integration: '🔗'
    }
    return icons[category as keyof typeof icons] || '❓'
  }

  // Render power-up card
  const renderPowerUpCard = (powerUp: BuiltInPowerUp, showActions: boolean = true) => (
    <Card key={powerUp.manifest.id} className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {powerUp.manifest.icon && (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={powerUp.manifest.icon} 
                  alt={powerUp.manifest.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{powerUp.manifest.name}</h3>
              <p className="text-sm text-gray-600">by {powerUp.manifest.author}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {powerUp.featured && (
              <Badge variant="default" className="bg-yellow-500">
                <Star className="w-3 h-3" />
                Featured
              </Badge>
            )}
            <Badge className={getCategoryColor(powerUp.category)}>
              {getCategoryIcon(powerUp.category)} {powerUp.category}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-700">{powerUp.manifest.description}</p>

        {/* Version and Permissions */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Version {powerUp.manifest.version}
          </div>
          
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-1">Permissions:</div>
            <div className="flex flex-wrap gap-1">
              {powerUp.manifest.permissions.map((perm: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {perm.type}:{perm.resource}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2">
            {powerUp.installed ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(powerUp)}
                >
                  {extensionManager.isEnabled(powerUp.manifest.id) ? (
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
                  onClick={() => handleUninstall(powerUp)}
                >
                  <Trash2 className="w-4 h-4" />
                  Uninstall
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleInstall(powerUp)}
                className="flex-1"
              >
                <Download className="w-4 h-4" />
                Install
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Show power-up details modal
                const instructions = powerUpsRegistry.getInstallationInstructions(powerUp.manifest.id)
                const troubleshooting = powerUpsRegistry.getTroubleshootingGuide(powerUp.manifest.id)
                
                // TODO: Show modal with instructions and troubleshooting
                // Power-up details loaded
              }}
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span>Loading power-ups...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Power-Ups</h2>
          <p className="text-gray-600">Enhance your workflow with powerful extensions</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Zap className="w-4 h-4" />
            {installedPowerUps.length} Installed
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'marketplace' | 'installed')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="installed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Installed ({installedPowerUps.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {powerUps.map(powerUp => renderPowerUpCard(powerUp))}
          </div>
          
          {powerUps.length === 0 && (
            <Card className="p-12 text-center">
              <div className="text-gray-500">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No power-ups available</h3>
                <p>Check back later for new extensions</p>
              </div>
            </Card>
          )}
        </TabsContent>
        
        {/* Installed Tab */}
        <TabsContent value="installed" className="space-y-4">
          {installedPowerUps.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No power-ups installed</h3>
                <p>Browse the marketplace to find extensions that enhance your workflow</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab('marketplace')}
                >
                  Browse Marketplace
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {installedPowerUps.map(powerUp => renderPowerUpCard(powerUp))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
