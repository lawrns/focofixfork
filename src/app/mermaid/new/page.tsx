'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MermaidEditor } from '@/features/mermaid/components/MermaidEditor';
import { MermaidPreview } from '@/features/mermaid/components/MermaidPreview';
import { CreateMermaidDiagramRequest } from '@/lib/models/mermaid';
import { mermaidService } from '@/lib/services/mermaid';

export default function NewMermaidDiagramPage() {
  const router = useRouter();
  const [title, setTitle] = useState('Untitled Diagram');
  const [description, setDescription] = useState('');
  const [mermaidCode, setMermaidCode] = useState(`graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`);
  const [isPublic, setIsPublic] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    // Load user's workspaces
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      // This would be implemented to fetch user's workspaces
      // For now, we'll use a placeholder
      setWorkspaces([]);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your diagram');
      return;
    }

    setLoading(true);
    try {
      const diagramData: CreateMermaidDiagramRequest = {
        title: title.trim(),
        description: description.trim(),
        mermaid_code: mermaidCode.trim(),
        is_public: isPublic,
        workspace_id: workspaceId,
        owner_id: null, // Will be set by the service from auth
      };

      const diagram = await mermaidService.createDiagram(diagramData);
      router.push(`/mermaid/${diagram.id}`);
    } catch (error: any) {
      console.error('Failed to save diagram:', error);
      alert(`Failed to save diagram: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/mermaid');
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">New Mermaid Diagram</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>Save Diagram</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Editor and Settings */}
        <div className="space-y-6">
          {/* Diagram Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Diagram Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter diagram title"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your diagram"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Make this diagram public</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Public diagrams can be viewed by anyone with the share link
                </p>
              </div>

              {workspaces.length > 0 && (
                <div>
                  <label htmlFor="workspace" className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace (optional)
                  </label>
                  <select
                    id="workspace"
                    value={workspaceId || ''}
                    onChange={(e) => setWorkspaceId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Personal</option>
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Mermaid Code Editor */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Mermaid Code</h2>
            <MermaidEditor
              value={mermaidCode}
              onChange={setMermaidCode}
              theme="light"
            />
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
            <MermaidPreview
              code={mermaidCode}
              theme="light"
              showErrors={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
