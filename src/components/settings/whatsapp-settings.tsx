'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { MessageCircle, Check, X, Copy } from 'lucide-react';

interface WhatsAppLinkStatus {
  linked: boolean;
  phone: string | null;
  verified: boolean;
  linkedAt?: string | null;
}

interface VerificationData {
  code: string;
  expiresAt: string;
  whatsappNumber: string;
  message: string;
}

export function WhatsAppSettings() {
  const [linkStatus, setLinkStatus] = useState<WhatsAppLinkStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [copied, setCopied] = useState(false);

  // Check link status on mount
  useEffect(() => {
    checkLinkStatus();
  }, []);

  const checkLinkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/whatsapp/unlink', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data);
      } else {
        setLinkStatus({ linked: false, phone: null, verified: false });
      }
    } catch (error) {
      console.error('Failed to check WhatsApp link status:', error);
      toast.error('Failed to load WhatsApp settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLink = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/whatsapp/link', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate verification code');
      }

      const data: VerificationData = await response.json();
      setVerificationData(data);
      toast.success('Verification code generated! Send it to WhatsApp.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/whatsapp/unlink', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to unlink WhatsApp');
      }

      toast.success('WhatsApp unlinked successfully');
      setShowUnlinkDialog(false);
      await checkLinkStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return '';
    // Format +1234567890 as +1 (234) 567-8900
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (isLoading && !linkStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Integration
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Integration
          </CardTitle>
          <CardDescription>
            Link your WhatsApp to receive notifications and create proposals via chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkStatus?.linked && linkStatus?.verified ? (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Linked
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatPhoneNumber(linkStatus.phone)}
                    </span>
                  </div>
                  {linkStatus.linkedAt && (
                    <p className="text-xs text-muted-foreground">
                      Linked on {new Date(linkStatus.linkedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowUnlinkDialog(true)}
                  disabled={isLoading}
                >
                  Unlink
                </Button>
              </div>

              <Alert>
                <MessageCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>You can now:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Send messages to create proposals</li>
                    <li>Receive task assignments via WhatsApp</li>
                    <li>Get mentions and comments notifications</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Not Linked
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect your WhatsApp to get started
                  </p>
                </div>
                <Button
                  onClick={() => setShowLinkDialog(true)}
                  disabled={isLoading}
                >
                  Link WhatsApp
                </Button>
              </div>

              <Alert>
                <MessageCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Benefits of linking WhatsApp:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Create proposals by sending messages</li>
                    <li>Receive real-time notifications</li>
                    <li>Manage tasks on the go</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Link WhatsApp Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link WhatsApp</DialogTitle>
            <DialogDescription>
              Enter your phone number to receive a verification code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!verificationData ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (234) 567-8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowLinkDialog(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleLink} disabled={isLoading}>
                    {isLoading ? 'Generating...' : 'Generate Code'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <Alert>
                  <MessageCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong className="block mb-2">Verification Code:</strong>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-2xl font-mono font-bold tracking-wider">
                        {verificationData.code}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(verificationData.code)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertDescription>
                    <strong>Next Steps:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
                      <li>Copy the verification code above</li>
                      <li>Open WhatsApp and message <strong>{verificationData.whatsappNumber}</strong></li>
                      <li>Send: <code className="bg-muted px-2 py-1 rounded">VERIFY {verificationData.code}</code></li>
                      <li>You&apos;ll receive a confirmation message</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <p className="text-xs text-muted-foreground text-center">
                  Code expires in 10 minutes
                </p>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLinkDialog(false);
                      setVerificationData(null);
                      setPhoneNumber('');
                      checkLinkStatus();
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlink WhatsApp Dialog */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink WhatsApp</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink your WhatsApp? You will no longer receive
              notifications or be able to create proposals via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlinkDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={isLoading}
            >
              {isLoading ? 'Unlinking...' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
