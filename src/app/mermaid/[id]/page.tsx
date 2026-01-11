'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MermaidDiagramWithVersions, MermaidDiagramVersion } from '@/lib/models/mermaid';
import { MermaidEditor } from '@/features/mermaid/components/MermaidEditor';
import { MermaidPreview } from '@/features/mermaid/components/MermaidPreview';
import { ShareDialog } from '@/features/mermaid/components/ShareDialog';
import { mermaidService } from '@/lib/services/mermaid';

export default function MermaidDiagramPage() {
  const params = useParams();
  const router = useRouter();
  const diagramId = params.id as string;

  const [diagram, setDiagram] = useState<MermaidDiagramWithVersions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const loadDiagram = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mermaidService.getDiagram(diagramId);
      setDiagram(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setMermaidCode(data.mermaid_code);
    } catch (error: any) {
      console.error('Failed to load diagram:', error);
      if (error.message.includes('not found')) {
        router.push('/mermaid');
      }
    } finally {
      setLoading(false);
    }
  }, [diagramId, router]);

  useEffect(() => {
    loadDiagram();
  }, [loadDiagram]);

  const handleSave = async () => {
    if (!diagram) return;

    setSaving(true);
    try {
      const updated = await mermaidService.updateDiagram(diagramId, {
        title: title.trim(),
        description: description.trim(),
        mermaid_code: mermaidCode.trim(),
      });

      setDiagram({ ...diagram, ...updated });
      setEditing(false);
    } catch (error: any) {
      console.error('Failed to save diagram:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!diagram) return;

    try {
      const version = await mermaidService.createVersion(diagramId, {
        mermaid_code: mermaidCode.trim(),
        change_description: 'Manual save',
      });

      // Reload diagram to get updated version info
      await loadDiagram();
    } catch (error: any) {
      console.error('Failed to create version:', error);
      alert(`Failed to create version: ${error.message}`);
    }
  };

  const handleRestoreVersion = async (version: MermaidDiagramVersion) => {
    if (!diagram) return;

    try {
      const updated = await mermaidService.restoreVersion(diagramId, version.version_number);
      setDiagram({ ...diagram, ...updated });
      setMermaidCode(updated.mermaid_code);
      setTitle(updated.title);
      setDescription(updated.description || '');
      setShowVersionHistory(false);
    } catch (error: any) {
      console.error('Failed to restore version:', error);
      alert(`Failed to restore version: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!diagram) return;

    if (!confirm('Are you sure you want to delete this diagram? This action cannot be undone.')) {
      return;
    }

    try {
      await mermaidService.deleteDiagram(diagramId);
      router.push('/mermaid');
    } catch (error: any) {
      console.error('Failed to delete diagram:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  const handleShareUpdate = async (updates: any) => {
    if (!diagram) return;

    try {
      const updated = await mermaidService.shareDiagram(diagramId, updates);
      setDiagram({ ...diagram, ...updated });
    } catch (error: any) {
      console.error('Failed to update sharing:', error);
      throw error;
    }
  };

  const handleExport = async (format: 'png' | 'svg' | 'pdf') => {
    if (!diagram) return;

    try {
      const blob = await mermaidService.exportDiagram(diagramId, { format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${diagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to export:', error);
      alert(`Failed to export: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!diagram) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Diagram not found</h2>
          <button
            onClick={() => router.push('/mermaid')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to diagrams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Title and Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/mermaid')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <h1 className="text-2xl font-semibold text-gray-900">{diagram.title}</h1>
            )}
            {diagram.is_public && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                Public
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setTitle(diagram.title);
                  setDescription(diagram.description || '');
                  setMermaidCode(diagram.mermaid_code);
                }}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                )}
                <span>Save</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowShareDialog(true)}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Share
              </button>
              <button
                onClick={() => setShowVersionHistory(true)}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Versions
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Export
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Editor */}
        <div className="space-y-6">
          {editing && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your diagram (optional)"
              />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Mermaid Code</h2>
              {editing && (
                <button
                  onClick={handleCreateVersion}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Save Version
                </button>
              )}
            </div>
            <MermaidEditor
              value={mermaidCode}
              onChange={setMermaidCode}
              theme="light"
              readonly={!editing}
            />
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="bg-white rounded-lg shadow-sm border">
            <MermaidPreview
              code={mermaidCode}
              theme="light"
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        diagram={diagram}
        shares={diagram.shares}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShareUpdate={handleShareUpdate}
      />

      {/* Version History Dialog */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {diagram.versions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">Version {version.version_number}</span>
                        {version.version_number === diagram.version && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                      {version.change_description && (
                        <p className="text-sm text-gray-500">{version.change_description}</p>
                      )}
                    </div>
                    {version.version_number !== diagram.version && (
                      <button
                        onClick={() => handleRestoreVersion(version)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
