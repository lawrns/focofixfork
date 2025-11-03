'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MermaidDiagram } from '@/lib/models/mermaid';
import { MermaidPreview } from '@/components/mermaid/MermaidPreview';
import { mermaidService } from '@/lib/services/mermaid';

export default function MermaidSharePage() {
  const params = useParams();
  const router = useRouter();
  const shareToken = params.token as string;

  const [diagram, setDiagram] = useState<MermaidDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicDiagram();
  }, [shareToken]);

  const loadPublicDiagram = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mermaidService.getPublicDiagramByToken(shareToken);
      setDiagram(data);
    } catch (error: any) {
      console.error('Failed to load public diagram:', error);
      setError(error.message || 'Failed to load diagram');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDiagram = async () => {
    if (!diagram) return;

    try {
      // This would create a copy for the authenticated user
      // For now, we'll redirect to the new diagram page with pre-filled data
      router.push(`/mermaid/new?copy=${diagram.id}`);
    } catch (error: any) {
      console.error('Failed to copy diagram:', error);
      alert(`Failed to copy diagram: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !diagram) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Diagram Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || 'This diagram may have been deleted or the sharing link has expired.'}
          </p>
          <button
            onClick={() => router.push('/mermaid')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Your Own Diagram
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                <h1 className="text-xl font-semibold text-gray-900">{diagram.title}</h1>
                <p className="text-sm text-gray-500">Shared publicly</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyDiagram}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Copy Diagram
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">About This Diagram</h2>
              
              {diagram.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{diagram.description}</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Created</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(diagram.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Last Updated</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(diagram.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Version</h3>
                  <p className="text-sm text-gray-600">v{diagram.version}</p>
                </div>

                {diagram.organization_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Organization</h3>
                    <p className="text-sm text-gray-600">Organization Diagram</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Public Diagram</p>
                    <p className="text-xs text-blue-700">Anyone with this link can view</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <MermaidPreview
                code={diagram.mermaid_code}
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
