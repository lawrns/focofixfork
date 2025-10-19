'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/design-system'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Accessibility, 
  Eye, 
  Keyboard, 
  Volume2, 
  Palette, 
  Type,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { accessibilityManager } from '@/lib/accessibility/accessibility-manager'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function AccessibilityPanel({ isOpen, onClose, className }: AccessibilityPanelProps) {
  const [settings, setSettings] = useState(accessibilityManager.getSettings())
  const [score, setScore] = useState(0)
  const [recommendations, setRecommendations] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      const report = accessibilityManager.generateReport()
      setScore(report.score)
      setRecommendations(report.recommendations)
    }
  }, [isOpen])

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    accessibilityManager.updateSetting(key, value)
    setSettings(accessibilityManager.getSettings())
  }

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large' | 'extra-large') => {
    handleSettingChange('fontSize', size)
  }

  const handleReset = () => {
    accessibilityManager.reset()
    setSettings(accessibilityManager.getSettings())
    const report = accessibilityManager.generateReport()
    setScore(report.score)
    setRecommendations(report.recommendations)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Accessibility className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Accessibility Settings</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          {/* Accessibility Score */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Accessibility Score</h3>
              <div className={cn(
                'px-2 py-1 rounded-full text-sm font-medium',
                score >= 90 ? 'bg-green-100 text-green-800' :
                score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              )}>
                {score}/100
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  score >= 90 ? 'bg-green-500' :
                  score >= 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                )}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-blue-900">Recommendations</h3>
              </div>
              <ul className="space-y-1">
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-blue-800 flex items-center space-x-2">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-6">
            {/* Visual Settings */}
            <div>
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Visual Settings</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>High Contrast</Label>
                    <p className="text-sm text-gray-600">Increase contrast for better visibility</p>
                  </div>
                  <Switch
                    checked={settings.highContrast}
                    onCheckedChange={(value) => handleSettingChange('highContrast', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Color Blind Support</Label>
                    <p className="text-sm text-gray-600">Use patterns and shapes instead of just colors</p>
                  </div>
                  <Switch
                    checked={settings.colorBlindSupport}
                    onCheckedChange={(value) => handleSettingChange('colorBlindSupport', value)}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Font Size</Label>
                  <div className="flex space-x-2">
                    {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                      <Button
                        key={size}
                        variant={settings.fontSize === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFontSizeChange(size)}
                        className="capitalize"
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Interaction Settings */}
            <div>
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Keyboard className="w-4 h-4" />
                <span>Interaction Settings</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Keyboard Navigation</Label>
                    <p className="text-sm text-gray-600">Enable keyboard-only navigation</p>
                  </div>
                  <Switch
                    checked={settings.keyboardNavigation}
                    onCheckedChange={(value) => handleSettingChange('keyboardNavigation', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Focus Visible</Label>
                    <p className="text-sm text-gray-600">Show clear focus indicators</p>
                  </div>
                  <Switch
                    checked={settings.focusVisible}
                    onCheckedChange={(value) => handleSettingChange('focusVisible', value)}
                  />
                </div>
              </div>
            </div>

            {/* Motion Settings */}
            <div>
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Motion Settings</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reduced Motion</Label>
                    <p className="text-sm text-gray-600">Minimize animations and transitions</p>
                  </div>
                  <Switch
                    checked={settings.reducedMotion}
                    onCheckedChange={(value) => handleSettingChange('reducedMotion', value)}
                  />
                </div>
              </div>
            </div>

            {/* Reading Settings */}
            <div>
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Type className="w-4 h-4" />
                <span>Reading Settings</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dyslexia Support</Label>
                    <p className="text-sm text-gray-600">Use dyslexia-friendly fonts and spacing</p>
                  </div>
                  <Switch
                    checked={settings.dyslexiaSupport}
                    onCheckedChange={(value) => handleSettingChange('dyslexiaSupport', value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
