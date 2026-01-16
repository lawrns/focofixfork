'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Copy, Check } from 'lucide-react';

interface TwoFactorSetup {
  secret: string;
  keyuri: string;
  qrCode: string;
  backupCodes: string[];
}

export function TwoFactorSettings({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(twoFactorEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to enable 2FA');
      }

      const data = await response.json();
      setSetupData(data);
      setShowSetupDialog(true);
    } catch (error) {
      toast.error('Failed to enable 2FA');
      // Error handled by UI feedback
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: setupData?.secret,
          token: verificationToken,
          backupCodes: setupData?.backupCodes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify token');
      }

      toast.success('2FA enabled successfully');
      setIsEnabled(true);
      setShowSetupDialog(false);
      setShowBackupCodes(true);
      setVerificationToken('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      toast.success('2FA disabled successfully');
      setIsEnabled(false);
      setShowDisableDialog(false);
    } catch (error) {
      toast.error('Failed to disable 2FA');
      // Error handled by UI feedback
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (showBackupCodes && setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save Your Backup Codes</CardTitle>
          <CardDescription>
            Keep these codes in a safe place. You can use any of them to sign in if you lose access to your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Each code can only be used once. Store them securely and don&rsquo;t share them with anyone.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {setupData.backupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 font-mono text-sm"
              >
                <span>{code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyBackupCode(code, index)}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setShowBackupCodes(false)}
            className="w-full"
          >
            I have saved my backup codes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {isEnabled
            ? 'Two-factor authentication is enabled on your account. You will be asked for a verification code in addition to your password when signing in.'
            : 'Two-factor authentication adds an additional layer of security to your account by requiring a verification code in addition to your password.'}
        </p>

        <div className="flex gap-2">
          {!isEnabled ? (
            <Button onClick={handleEnable} disabled={isLoading}>
              {isLoading ? 'Setting up...' : 'Enable 2FA'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setShowDisableDialog(true)}
              disabled={isLoading}
            >
              {isLoading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          )}
        </div>
      </CardContent>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (like Google Authenticator or Authy)
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupData.qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48 border border-zinc-200 dark:border-zinc-800 rounded"
                  loading="lazy"
                />
              </div>

              {/* Manual Entry */}
              <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  {`Can&rsquo;t scan? Enter this code manually:`}
                </p>
                <code className="text-sm font-mono break-all">{setupData.secret}</code>
              </div>

              {/* Verification Token Input */}
              <div className="space-y-2">
                <Label htmlFor="verification-token">Enter 6-digit code from your authenticator</Label>
                <Input
                  id="verification-token"
                  placeholder="000000"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  maxLength={6}
                  className="font-mono text-center text-2xl tracking-widest"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSetupDialog(false);
                setVerificationToken('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleVerifyToken} disabled={isLoading || verificationToken.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable 2FA? Your account will be less secure.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isLoading}
            >
              {isLoading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
