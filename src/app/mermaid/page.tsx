'use client';

// Mermaid diagrams page - Client Component with hooks
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MermaidDiagramListItem } from '@/lib/models/mermaid';
import { mermaidService } from '@/lib/services/mermaid';

// Mermaid diagrams list page component
export default function MermaidPage() {
  const router = useRouter();
  const [diagrams, setDiagrams] = useState<MermaidDiagramListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'shared'>('all');

  const loadDiagrams = useCallback(async () => {
    try {
      setLoading(true);
      const options: any = {
        search: search || undefined,
      };

      if (filter === 'public') {
        options.isPublic = true;
      } else if (filter === 'private') {
        options.isPublic = false;
      } else if (filter === 'shared') {
        options.sharedWithMe = true;
      }

      const result = await mermaidService.listDiagrams(options);
      setDiagrams(result.diagrams);
    } catch (error) {
      console.error('Failed to load diagrams:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    loadDiagrams();
  }, [loadDiagrams]);

  const createNewDiagram = async () => {
    try {
      const diagram = await mermaidService.createDiagram({
        title: 'Untitled Diagram',
        description: '',
        mermaid_code: `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`,
        is_public: false,
      });
      router.push(`/mermaid/${diagram.id}`);
    } catch (error) {
      console.error('Failed to create diagram:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Mermaid Diagrams</h1>
        </div>
        <button
          onClick={createNewDiagram}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Diagram</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search diagrams..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('public')}
            className={`px-4 py-2 rounded-md transition-colors ${
              filter === 'public'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setFilter('private')}
            className={`px-4 py-2 rounded-md transition-colors ${
              filter === 'private'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Private
          </button>
          <button
            onClick={() => setFilter('shared')}
            className={`px-4 py-2 rounded-md transition-colors ${
              filter === 'shared'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Shared with me
          </button>
        </div>
      </div>

      {/* Diagrams Grid */}
      {diagrams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No diagrams found</h3>
          <p className="text-gray-600 mb-4">
            {search ? 'Try adjusting your search or filters' : 'Create your first diagram to get started'}
          </p>
          {!search && (
            <button
              onClick={createNewDiagram}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Diagram
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diagrams.map((diagram) => (
            <div
              key={diagram.id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/mermaid/${diagram.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {diagram.title}
                  </h3>
                  {diagram.is_public && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Public
                    </span>
                  )}
                </div>

                {diagram.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {diagram.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    Updated {formatDate(diagram.updated_at)}
                  </div>
                  <div>
                    v{diagram.version}
                  </div>
                </div>

                {diagram.organization_name && (
                  <div className="mt-2 text-xs text-gray-500">
                    Organization: {diagram.organization_name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
