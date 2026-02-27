'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Volume2,
  MousePointer,
  Zap,
  Monitor,
  Type,
  Palette,
  Keyboard,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAccessibility } from '@/lib/accessibility/accessibility';
import { toast } from 'sonner';

export function AccessibilitySettings() {
  const {
    settings,
    updateSettings,
    testColorContrast,
    meetsContrastStandard
  } = useAccessibility();

  const [tempSettings, setTempSettings] = useState(settings);
  const [contrastRatio, setContrastRatio] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate contrast ratio when colors change
  useEffect(() => {
    const ratio = testColorContrast('#0A0A0A', '#FFFFFF');
    setContrastRatio(ratio);
  }, [testColorContrast]);

  // Check for changes
  useEffect(() => {
    const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(settings);
    setHasChanges(hasChanges);
  }, [tempSettings, settings]);

  const handleSettingChange = (key: keyof typeof tempSettings, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(tempSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setTempSettings(settings);
    setHasChanges(false);
  };

  const testAnnouncement = () => {
    // Import dynamically to avoid circular dependency
    import('@/lib/accessibility/accessibility').then(({ AccessibilityService }) => {
      AccessibilityService.announce('This is a test announcement for screen readers.');
      toast.success('Announcement sent to screen readers');
    });
  };

  const runAccessibilityTest = () => {
    // Basic accessibility test
    const issues = [];

    // Check for missing alt text on images
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images missing alt text`);
    }

    // Check for buttons without accessible names
    const buttonsWithoutLabel = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    if (buttonsWithoutLabel.length > 0) {
      issues.push(`${buttonsWithoutLabel.length} buttons without accessible names`);
    }

    // Check for form fields without labels
    const inputsWithoutLabel = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([placeholder])');
    if (inputsWithoutLabel.length > 0) {
      issues.push(`${inputsWithoutLabel.length} form fields without labels`);
    }

    if (issues.length === 0) {
      toast.success('No accessibility issues found on this page!');
    } else {
      toast.warning(`Found ${issues.length} accessibility issues: ${issues.join(', ')}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#0052CC]" />
            Accessibility Settings
          </CardTitle>
          <CardDescription>
            Customize your experience to meet your accessibility needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">WCAG 2.1 AA Compliance</p>
              <p className="text-xs text-muted-foreground">
                Foco is designed to meet WCAG 2.1 AA accessibility standards
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3" />
              Compliant
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Motion & Animation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00B894]" />
            Motion & Animation
          </CardTitle>
          <CardDescription>
            Control animations and transitions for comfort
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reduced-motion" className="text-sm font-medium">
                Reduced Motion
              </Label>
              <p className="text-xs text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={tempSettings.reducedMotion}
              onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              When enabled, this reduces motion and animation to prevent vestibular disorders and improve accessibility for users with motion sensitivity.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[#0052CC]" />
            Visual Accessibility
          </CardTitle>
          <CardDescription>
            Adjust visual elements for better readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="high-contrast" className="text-sm font-medium">
                High Contrast Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={tempSettings.highContrast}
              onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="large-text" className="text-sm font-medium">
                Large Text
              </Label>
              <p className="text-xs text-muted-foreground">
                Increase text size throughout the application
              </p>
            </div>
            <Switch
              id="large-text"
              checked={tempSettings.largeText}
              onCheckedChange={(checked) => handleSettingChange('largeText', checked)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Color Contrast</Label>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Current Contrast Ratio</span>
                <Badge variant={meetsContrastStandard(contrastRatio) ? "default" : "destructive"}>
                  {contrastRatio.toFixed(2)}:1
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#0A0A0A] rounded"></div>
                  <span>Text</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border rounded"></div>
                  <span>Background</span>
                </div>
              </div>
              {meetsContrastStandard(contrastRatio) && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Meets WCAG AA standards (4.5:1 minimum)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sensory Feedback Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#00B894]" />
            Sensory Feedback
          </CardTitle>
          <CardDescription>
            Control how Foco uses sound and touch to guide your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="haptic-feedback" className="text-sm font-medium">
                Haptic Feedback
              </Label>
              <p className="text-xs text-muted-foreground">
                Vibrate on successful actions (Mobile only)
              </p>
            </div>
            <Switch
              id="haptic-feedback"
              checked={tempSettings.enableHapticFeedback}
              onCheckedChange={(checked) => handleSettingChange('enableHapticFeedback', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-notifications" className="text-sm font-medium">
                Sound Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Play subtle audio cues for important events
              </p>
            </div>
            <Switch
              id="sound-notifications"
              checked={tempSettings.enableSoundNotifications}
              onCheckedChange={(checked) => handleSettingChange('enableSoundNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#00B894]" />
            Navigation & Input
          </CardTitle>
          <CardDescription>
            Customize keyboard navigation and input behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="keyboard-nav" className="text-sm font-medium">
                Enhanced Keyboard Navigation
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable skip links and enhanced keyboard shortcuts
              </p>
            </div>
            <Switch
              id="keyboard-nav"
              checked={tempSettings.keyboardNavigation}
              onCheckedChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="focus-visible" className="text-sm font-medium">
                Focus Indicators
              </Label>
              <p className="text-xs text-muted-foreground">
                Show visible focus outlines for keyboard navigation
              </p>
            </div>
            <Switch
              id="focus-visible"
              checked={tempSettings.focusVisible}
              onCheckedChange={(checked) => handleSettingChange('focusVisible', checked)}
            />
          </div>

          <Alert>
            <Keyboard className="h-4 w-4" />
            <AlertDescription>
              <strong>Keyboard Shortcuts:</strong><br />
              Ctrl/Cmd + Home: Skip to main content<br />
              Ctrl/Cmd + End: Skip to navigation<br />
              Tab: Navigate through interactive elements
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Screen Reader Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#0052CC]" />
            Screen Reader Support
          </CardTitle>
          <CardDescription>
            Settings for screen reader users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="screen-reader" className="text-sm font-medium">
                Screen Reader Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Optimize interface for screen reader compatibility
              </p>
            </div>
            <Switch
              id="screen-reader"
              checked={tempSettings.screenReader}
              onCheckedChange={(checked) => handleSettingChange('screenReader', checked)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={testAnnouncement} variant="outline" size="sm">
              <Volume2 className="w-4 h-4" />
              Test Announcement
            </Button>
            <Button onClick={runAccessibilityTest} variant="outline" size="sm">
              <Eye className="w-4 h-4" />
              Check Page
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Foco includes comprehensive ARIA labels, semantic HTML, and screen reader announcements to ensure compatibility with assistive technologies.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Changes */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Unsaved Changes</p>
                  <p className="text-sm text-orange-600">You have unsaved accessibility settings</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" size="sm">
                  Reset
                </Button>
                <Button onClick={handleSave} size="sm" className="bg-[#0052CC] hover:bg-[#004299]">
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accessibility Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#00B894]" />
            Accessibility Resources
          </CardTitle>
          <CardDescription>
            Learn more about accessibility and get support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">WCAG Guidelines</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Web Content Accessibility Guidelines provide standards for web accessibility.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noopener noreferrer">
                  Learn More
                </a>
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Screen Reader Guide</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Popular screen readers and how to use them effectively.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://www.w3.org/WAI/people-use-web/tools-techniques/" target="_blank" rel="noopener noreferrer">
                  Screen Readers
                </a>
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Keyboard Navigation</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Essential keyboard shortcuts and navigation patterns.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://www.w3.org/WAI/WCAG21/quickref/#keyboard" target="_blank" rel="noopener noreferrer">
                  Keyboard Guide
                </a>
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Report Issues</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Found an accessibility issue? Let us know.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:accessibility@foco.com?subject=Accessibility Issue">
                  Report Issue
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
