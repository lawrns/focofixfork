'use client';

/**
 * Media Gallery Component
 * 
 * Grid display of generated media assets with filtering and actions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Search,
  Download,
  Trash2,
  MoreVertical,
  ImageIcon,
  FileCode,
  Wand2,
  X,
  ExternalLink,
  Filter,
  Grid3X3,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GeneratedMediaAsset, MediaAssetType } from '../types';

interface MediaGalleryProps {
  projectId?: string;
  className?: string;
  onSelect?: (asset: GeneratedMediaAsset) => void;
  selectable?: boolean;
}

const TYPE_FILTERS: { value: MediaAssetType | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Grid3X3 className="h-4 w-4" /> },
  { value: 'generated_image', label: 'AI Generated', icon: <Wand2 className="h-4 w-4" /> },
  { value: 'mermaid_png', label: 'Diagrams', icon: <FileCode className="h-4 w-4" /> },
  { value: 'thumbnail', label: 'Thumbnails', icon: <ImageIcon className="h-4 w-4" /> },
];

const ITEMS_PER_PAGE = 12;

export function MediaGallery({
  projectId,
  className,
  onSelect,
  selectable = false,
}: MediaGalleryProps) {
  const [assets, setAssets] = useState<GeneratedMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<GeneratedMediaAsset | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch assets
  const fetchAssets = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        offset: currentOffset.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (projectId) {
        params.append('projectId', projectId);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/media?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch assets');
      }

      const newAssets = result.assets || [];
      
      setAssets(prev => reset ? newAssets : [...prev, ...newAssets]);
      setHasMore(newAssets.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);

    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }, [offset, typeFilter, projectId, searchQuery]);

  // Initial load
  useEffect(() => {
    void fetchAssets(true);
  }, [fetchAssets, typeFilter, projectId]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      void fetchAssets(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAssets, searchQuery]);

  // Infinite scroll
  useEffect(() => {
    if (loading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchAssets();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, hasMore, fetchAssets]);

  const handleDelete = useCallback(async (asset: GeneratedMediaAsset) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(asset.id));

    try {
      const response = await fetch(`/api/media/${asset.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete');
      }

      setAssets(prev => prev.filter(a => a.id !== asset.id));
      toast.success('Asset deleted');

    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  }, []);

  const handleDownload = useCallback(async (asset: GeneratedMediaAsset) => {
    if (!asset.public_url) return;

    try {
      const response = await fetch(asset.public_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const extension = asset.type === 'mermaid_png' || asset.type === 'generated_image' ? 'png' : 'jpg';
      a.download = `asset-${asset.id.slice(0, 8)}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Downloaded!');
    } catch {
      toast.error('Failed to download');
    }
  }, []);

  const handleSelect = useCallback((asset: GeneratedMediaAsset) => {
    if (selectable) {
      onSelect?.(asset);
    } else {
      setSelectedAsset(asset);
    }
  }, [selectable, onSelect]);

  const getTypeLabel = (type: MediaAssetType) => {
    switch (type) {
      case 'generated_image':
        return 'AI Generated';
      case 'mermaid_png':
        return 'Diagram';
      case 'thumbnail':
        return 'Thumbnail';
      case 'diagram_export':
        return 'Export';
      default:
        return type;
    }
  };

  const getTypeColor = (type: MediaAssetType) => {
    switch (type) {
      case 'generated_image':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'mermaid_png':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'thumbnail':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <TabsList>
              {TYPE_FILTERS.map((filter) => (
                <TabsTrigger
                  key={filter.value}
                  value={filter.value}
                  className="flex items-center gap-1"
                >
                  {filter.icon}
                  <span className="hidden sm:inline">{filter.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      {assets.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ImageIcon className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No media assets found</p>
          <p className="text-sm">Generate images or export diagrams to see them here</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className={cn(
                "group cursor-pointer overflow-hidden transition-all hover:shadow-md",
                selectable && "hover:ring-2 hover:ring-primary"
              )}
              onClick={() => handleSelect(asset)}
            >
              <CardContent className="p-0">
                <div className="aspect-square bg-muted relative">
                  {asset.public_url ? (
                    <Image
                      src={asset.public_url}
                      alt={asset.prompt || 'Media asset'}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(asset);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset);
                      }}
                      disabled={deletingIds.has(asset.id)}
                    >
                      {deletingIds.has(asset.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Type Badge */}
                  <Badge
                    className={cn("absolute top-2 left-2 text-xs", getTypeColor(asset.type))}
                  >
                    {getTypeLabel(asset.type)}
                  </Badge>
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm truncate" title={asset.prompt || 'Untitled'}>
                    {asset.prompt || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Loading skeletons */}
          {loading && (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={`skeleton-${i}`}>
                  <CardContent className="p-0">
                    <Skeleton className="aspect-square" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectable && "hover:ring-2 hover:ring-primary"
              )}
              onClick={() => handleSelect(asset)}
            >
              <CardContent className="p-3 flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                  {asset.public_url ? (
                    <Image
                      src={asset.public_url}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getTypeColor(asset.type))}>
                      {getTypeLabel(asset.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm truncate mt-1" title={asset.prompt || 'Untitled'}>
                    {asset.prompt || 'Untitled'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(asset);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset);
                    }}
                    disabled={deletingIds.has(asset.id)}
                  >
                    {deletingIds.has(asset.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {loading && (
            <>
              {[...Array(3)].map((_, i) => (
                <Card key={`list-skeleton-${i}`}>
                  <CardContent className="p-3 flex items-center gap-4">
                    <Skeleton className="w-16 h-16 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Preview Dialog */}
      {selectedAsset && (
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge className={getTypeColor(selectedAsset.type)}>
                  {getTypeLabel(selectedAsset.type)}
                </Badge>
              </DialogTitle>
              {selectedAsset.prompt && (
                <DialogDescription>{selectedAsset.prompt}</DialogDescription>
              )}
            </DialogHeader>
            
            <div className="mt-4">
              {selectedAsset.public_url && (
                <Image
                  src={selectedAsset.public_url}
                  alt={selectedAsset.prompt || 'Media asset'}
                  width={1200}
                  height={900}
                  unoptimized
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                />
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Created {new Date(selectedAsset.created_at).toLocaleString()}
                {selectedAsset.cost_usd && (
                  <span className="ml-2">• Cost: ${selectedAsset.cost_usd.toFixed(4)}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedAsset.public_url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>
                <Button onClick={() => handleDownload(selectedAsset)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
