'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarUpload({ currentAvatarUrl, onUploadComplete, onError }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'File must be an image (JPEG, PNG, WebP, or GIF)',
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File size must be less than 5MB',
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validation = validateFile(file);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      onError?.(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);

    // Show preview using FileReader
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      onUploadComplete(data.url);

      // Reset state
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
        <CardDescription>Upload a profile picture. Max size: 5MB. Supports JPEG, PNG, WebP, GIF.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="flex flex-col items-center space-y-2">
              <img
                src={preview}
                alt="Avatar preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-800"
              />
              <p className="text-sm text-zinc-500">Preview</p>
            </div>
          )}

          {/* File Input */}
          <div>
            <Label htmlFor="avatar-input" className="text-base font-medium">
              Choose Image
            </Label>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Image
              </Button>
              {selectedFile && (
                <Button onClick={handleUpload} disabled={isUploading} className="flex-1">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="avatar-input"
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload avatar"
            />
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">Selected: {selectedFile.name}</p>
              <p className="text-zinc-500 text-xs">Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
