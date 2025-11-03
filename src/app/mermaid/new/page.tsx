'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MermaidEditor } from '@/components/mermaid/MermaidEditor';
import { MermaidPreview } from '@/components/mermaid/MermaidPreview';
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
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    // Load user's organizations
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      // This would be implemented to fetch user's organizations
      // For now, we'll use a placeholder
      setOrganizations([]);
    } catch (error) {
      console.error('Failed to load organizations:', error);
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
        organization_id: organizationId,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">New Mermaid Diagram</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                    placeholder="Describe your diagram (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Sharing Settings */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Sharing Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="visibility"
                        checked={!isPublic}
                        onChange={() => setIsPublic(false)}
                        className="mr-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Private</span>
                        <p className="text-xs text-gray-500">Only you can view and edit</p>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="visibility"
                        checked={isPublic}
                        onChange={() => setIsPublic(true)}
                        className="mr-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Public</span>
                        <p className="text-xs text-gray-500">Anyone with the link can view</p>
                      </div>
                    </label>
                  </div>
                </div>

                {organizations.length > 0 && (
                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                      Organization (optional)
                    </label>
                    <select
                      id="organization"
                      value={organizationId || ''}
                      onChange={(e) => setOrganizationId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Personal</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Mermaid Editor */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Mermaid Code</h2>
              <MermaidEditor
                value={mermaidCode}
                onChange={setMermaidCode}
                theme="light"
                placeholder="Enter your Mermaid diagram code here..."
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
      </div>
    </div>
  );
}
