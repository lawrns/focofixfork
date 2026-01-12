'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Smartphone,
  Download,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Bell,
  BellOff,
  HardDrive,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { usePWA, PWACapabilities } from '@/lib/services/pwa';
import { toast } from 'sonner';

export function PWASettings() {
  const {
    capabilities,
    install,
    update,
    clearCache,
    requestNotificationPermission,
    sendNotification,
    isOffline,
    syncOfflineData,
    refreshCapabilities,
  } = usePWA();

  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        await refreshCapabilities();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const success = await update();
      if (success) {
        toast.success('Update installed! Refreshing...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.info('No updates available');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearCache();
      await refreshCapabilities();
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineData();
      toast.success('Offline data synced successfully');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast.success('Notifications enabled!');
      // Send a test notification
      await sendNotification('Notifications Enabled!', {
        body: 'You\'ll now receive important updates from Foco.',
        tag: 'notification-test',
      });
    } else {
      toast.error('Notification permission denied');
    }
  };

  const handleTestNotification = async () => {
    await sendNotification('Test Notification', {
      body: 'This is a test notification from Foco.',
      tag: 'notification-test',
    });
    toast.success('Test notification sent!');
  };

  const getCacheStatusColor = (status: string) => {
    switch (status) {
      case 'full': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  const getCacheStatusText = (status: string) => {
    switch (status) {
      case 'full': return 'Fully Cached';
      case 'partial': return 'Partially Cached';
      default: return 'Not Cached';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOffline ? <WifiOff className="w-5 h-5 text-red-600" /> : <Wifi className="w-5 h-5 text-green-600" />}
            Connection Status
          </CardTitle>
          <CardDescription>
            Current network status and offline capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOffline ? (
                <WifiOff className="w-5 h-5 text-red-600" />
              ) : (
                <Wifi className="w-5 h-5 text-green-600" />
              )}
              <span className="font-medium">
                {isOffline ? 'Offline' : 'Online'}
              </span>
            </div>
            <Badge variant={isOffline ? 'destructive' : 'default'}>
              {isOffline ? 'Limited Features' : 'Full Features'}
            </Badge>
          </div>

          {isOffline && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You&apos;re currently offline. Some features may be limited, but you can continue working.
                Changes will be synced when you&apos;re back online.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSyncData}
              disabled={!isOffline && isSyncing}
              variant="outline"
              size="sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Sync Data
                </>
              )}
            </Button>
            <Button onClick={refreshCapabilities} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installation & Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#0052CC]" />
            App Installation
          </CardTitle>
          <CardDescription>
            Install Foco as a native app for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Installation Status</Label>
              <div className="flex items-center gap-2">
                {capabilities.isInstalled ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Installed</span>
                  </>
                ) : capabilities.canInstall ? (
                  <>
                    <Download className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Ready to Install</span>
                  </>
                ) : (
                  <>
                    <Info className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">Not Available</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>App Updates</Label>
              <div className="flex items-center gap-2">
                {capabilities.hasUpdate ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium">Update Available</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Up to Date</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {capabilities.canInstall && !capabilities.isInstalled && (
              <Button onClick={handleInstall} disabled={isInstalling}>
                {isInstalling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Install App
                  </>
                )}
              </Button>
            )}

            {capabilities.hasUpdate && (
              <Button onClick={handleUpdate} disabled={isUpdating} variant="outline">
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Update App
                  </>
                )}
              </Button>
            )}
          </div>

          {capabilities.isInstalled && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Foco is installed as a native app. You can launch it from your home screen or app drawer.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#00B894]" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Manage cached data for offline access and performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Cache Status</div>
              <div className="text-sm text-muted-foreground">
                {getCacheStatusText(capabilities.cacheStatus)}
              </div>
            </div>
            <Badge className={getCacheStatusColor(capabilities.cacheStatus)}>
              {capabilities.cacheStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cache Utilization</span>
              <span>
                {capabilities.cacheStatus === 'full' ? '100%' :
                 capabilities.cacheStatus === 'partial' ? '50%' : '0%'}
              </span>
            </div>
            <Progress
              value={
                capabilities.cacheStatus === 'full' ? 100 :
                capabilities.cacheStatus === 'partial' ? 50 : 0
              }
            />
          </div>

          <Button
            onClick={handleClearCache}
            disabled={isClearingCache}
            variant="outline"
            className="w-full"
          >
            {isClearingCache ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Clearing Cache...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Clear Cache
              </>
            )}
          </Button>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Clearing the cache will remove all offline data. You&apos;ll need to reconnect to sync your data again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {notificationPermission === 'granted' ? (
              <Bell className="w-5 h-5 text-[#0052CC]" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-600" />
            )}
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get notified about important updates and deadlines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Notification Status</div>
              <div className="text-sm text-muted-foreground">
                {notificationPermission === 'granted' ? 'Enabled' :
                 notificationPermission === 'denied' ? 'Blocked' : 'Not requested'}
              </div>
            </div>
            <Badge variant={
              notificationPermission === 'granted' ? 'default' :
              notificationPermission === 'denied' ? 'destructive' : 'secondary'
            }>
              {notificationPermission === 'granted' ? 'ENABLED' :
               notificationPermission === 'denied' ? 'BLOCKED' : 'DISABLED'}
            </Badge>
          </div>

          <div className="flex gap-2">
            {notificationPermission !== 'granted' && (
              <Button onClick={handleRequestNotifications} variant="outline">
                <Bell className="w-4 h-4" />
                Enable Notifications
              </Button>
            )}

            {notificationPermission === 'granted' && (
              <Button onClick={handleTestNotification} variant="outline">
                <Bell className="w-4 h-4" />
                Test Notification
              </Button>
            )}
          </div>

          {notificationPermission === 'denied' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked. Please enable them in your browser settings to receive updates.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* PWA Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00B894]" />
            PWA Features
          </CardTitle>
          <CardDescription>
            Advanced features available when using Foco as an installed app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Always Available</h4>
              <p className="text-sm text-muted-foreground">
                Launch Foco instantly from your home screen
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Offline Access</h4>
              <p className="text-sm text-muted-foreground">
                Continue working even without internet
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Auto Updates</h4>
              <p className="text-sm text-muted-foreground">
                Get the latest features automatically
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Native Experience</h4>
              <p className="text-sm text-muted-foreground">
                Full-screen app experience with native gestures
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
