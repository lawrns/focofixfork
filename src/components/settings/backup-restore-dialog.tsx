'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Upload, Shield, Database, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface BackupRestoreDialogProps {
  children: React.ReactNode;
}

export function BackupRestoreDialog({ children }: BackupRestoreDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeTimeTracking, setIncludeTimeTracking] = useState(true);
  const [includeFiles, setIncludeFiles] = useState(false);

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        includeComments: includeComments.toString(),
        includeTimeTracking: includeTimeTracking.toString(),
        includeFiles: includeFiles.toString(),
      });

      const response = await fetch(`/api/backup?${params}`);
      const data = await response.json();

      if (data.success) {
        toast.success('Backup created and downloaded successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Backup restored successfully! Restored ${data.restored.projects} projects, ${data.restored.tasks} tasks, and more.`);
        setIsOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0052CC]" />
            Backup & Restore
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create Backup Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0052CC]" />
              <h3 className="text-lg font-semibold">Create Backup</h3>
            </div>

            <div className="space-y-3 pl-7">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-comments"
                  checked={includeComments}
                  onCheckedChange={(checked) => setIncludeComments(checked === true)}
                />
                <Label htmlFor="include-comments" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Include comments and discussions
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-time"
                  checked={includeTimeTracking}
                  onCheckedChange={(checked) => setIncludeTimeTracking(checked === true)}
                />
                <Label htmlFor="include-time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Include time tracking data
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-files"
                  checked={includeFiles}
                  onCheckedChange={(checked) => setIncludeFiles(checked === true)}
                  disabled
                />
                <Label htmlFor="include-files" className="text-gray-500">
                  Include file attachments (coming soon)
                </Label>
              </div>
            </div>

            <Button
              onClick={handleCreateBackup}
              disabled={isLoading}
              className="w-full bg-[#0052CC] hover:bg-[#004299]"
            >
              <Download className="w-4 h-4" />
              {isLoading ? 'Creating Backup...' : 'Create & Download Backup'}
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E5E5E5]" />

          {/* Restore Backup Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#00B894]" />
              <h3 className="text-lg font-semibold">Restore Backup</h3>
            </div>

            <div className="bg-[#F8F9FA] p-4 rounded-lg">
              <p className="text-sm text-[#6B6B6B] mb-3">
                Upload a previously created backup file to restore your data.
                This will not overwrite existing data with the same names.
              </p>

              <form onSubmit={handleRestoreBackup}>
                <div className="space-y-3">
                  <Input
                    type="file"
                    name="file"
                    accept=".json"
                    required
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0052CC] file:text-white hover:file:bg-[#004299]"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-[#00B894] text-[#00B894] hover:bg-[#00B894] hover:text-white"
                  >
                    <Upload className="w-4 h-4" />
                    {isLoading ? 'Restoring...' : 'Restore Backup'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <Shield className="w-5 h-5 text-yellow-600" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Important Notes</h4>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>Backups include all your organizations, projects, milestones, and tasks</li>
                  <li>Restore operations skip duplicate items to prevent data loss</li>
                  <li>Always create a backup before restoring to preserve your current data</li>
                  <li>File attachments backup/restore will be available in a future update</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
