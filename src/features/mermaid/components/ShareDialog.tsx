'use client';

import React, { useState, useEffect } from 'react';
import { MermaidDiagram, MermaidDiagramShare } from '@/lib/models/mermaid';

interface ShareDialogProps {
  diagram: MermaidDiagram;
  shares: MermaidDiagramShare[];
  isOpen: boolean;
  onClose: () => void;
  onShareUpdate: (updates: any) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  diagram,
  shares,
  isOpen,
  onClose,
  onShareUpdate,
}) => {
  const [isPublic, setIsPublic] = useState(diagram.is_public);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsPublic(diagram.is_public);
    if (diagram.share_token) {
      setShareLink(`${window.location.origin}/mermaid/share/${diagram.share_token}`);
    }
  }, [diagram]);

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      await onShareUpdate({ is_public: !isPublic });
      setIsPublic(!isPublic);
      if (!isPublic) {
        // Generate new share link when making public
        const newToken = Math.random().toString(36).substr(2, 32);
        setShareLink(`${window.location.origin}/mermaid/share/${newToken}`);
      }
    } catch (error) {
      console.error('Failed to update public status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareWithUser = async () => {
    if (!userEmail.trim()) return;

    setLoading(true);
    try {
      // In a real implementation, you'd look up the user by email
      // For now, we'll just call the share update
      await onShareUpdate({
        shared_with_user_id: 'user-id-placeholder', // This would be resolved from email
        permission,
      });
      setUserEmail('');
    } catch (error) {
      console.error('Failed to share with user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (userId: string) => {
    setLoading(true);
    try {
      await onShareUpdate({ revoke_user_id: userId });
    } catch (error) {
      console.error('Failed to revoke share:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Share Diagram</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Public sharing */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Public Access</h3>
                <p className="text-xs text-gray-500">Anyone with the link can view</p>
              </div>
              <button
                onClick={handleTogglePublic}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isPublic && shareLink && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User sharing */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share with Specific Users</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  inputMode="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view">Can view</option>
                  <option value="edit">Can edit</option>
                </select>
                <button
                  onClick={handleShareWithUser}
                  disabled={loading || !userEmail.trim()}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Shared With</h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {share.shared_with_user_id || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Permission: {share.permission === 'edit' ? 'Can edit' : 'Can view'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.shared_with_user_id || '')}
                      disabled={loading}
                      className="text-sm text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
