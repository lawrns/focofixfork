'use client';

/**
 * Image Generator Component
 * 
 * UI for generating images using Gemini Flash
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Wand2, 
  Download, 
  Share2, 
  ImageIcon, 
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GeneratedMediaAsset, GenerationProgress } from '../types';

interface ImageGeneratorProps {
  projectId?: string;
  onAssetCreated?: (asset: GeneratedMediaAsset) => void;
  className?: string;
}

interface RecentGeneration {
  id: string;
  prompt: string;
  thumbnailUrl?: string;
  createdAt: string;
  status: 'generating' | 'complete' | 'error';
}

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)', icon: '□' },
  { value: '4:3', label: 'Standard (4:3)', icon: '▭' },
  { value: '16:9', label: 'Widescreen (16:9)', icon: '▭' },
  { value: '9:16', label: 'Portrait (9:16)', icon: '▯' },
];

const EXAMPLE_PROMPTS = [
  'A minimalist logo for a productivity app, flat design, blue gradient',
  'A workspace with multiple monitors showing code, cozy lighting, plants',
  'Abstract geometric shapes representing data flow, purple and teal colors',
  'A team collaborating around a whiteboard, modern office, natural light',
];

export function ImageGenerator({ 
  projectId, 
  onAssetCreated,
  className 
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3' | '16:9' | '9:16'>('1:1');
  const [progress, setProgress] = useState<GenerationProgress>({ status: 'idle', progress: 0 });
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [currentResult, setCurrentResult] = useState<GeneratedMediaAsset | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const generationId = Date.now().toString();
    
    // Add to recent generations
    const newGeneration: RecentGeneration = {
      id: generationId,
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
      status: 'generating',
    };
    
    setRecentGenerations(prev => [newGeneration, ...prev]);
    setProgress({ status: 'generating', progress: 10, message: 'Sending to Gemini...' });
    setCurrentResult(null);

    try {
      setProgress({ status: 'generating', progress: 30, message: 'Generating image...' });

      const response = await fetch('/api/media/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          projectId,
          aspectRatio,
        }),
      });

      setProgress({ status: 'uploading', progress: 70, message: 'Uploading to storage...' });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate image');
      }

      setProgress({ status: 'complete', progress: 100 });
      setCurrentResult(result.asset);
      
      // Update recent generations
      setRecentGenerations(prev => 
        prev.map(g => 
          g.id === generationId 
            ? { ...g, status: 'complete', thumbnailUrl: result.asset?.public_url }
            : g
        )
      );

      onAssetCreated?.(result.asset);
      toast.success('Image generated successfully!');

    } catch (error) {
      console.error('Generation error:', error);
      setProgress({ status: 'error', progress: 0, message: error instanceof Error ? error.message : 'Unknown error' });
      
      setRecentGenerations(prev => 
        prev.map(g => 
          g.id === generationId ? { ...g, status: 'error' } : g
        )
      );
      
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    }
  }, [prompt, aspectRatio, projectId, onAssetCreated]);

  const handleDownload = useCallback(async (asset: GeneratedMediaAsset) => {
    if (!asset.public_url) return;
    
    try {
      const response = await fetch(asset.public_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${asset.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch {
      toast.error('Failed to download');
    }
  }, []);

  const handleShare = useCallback(async (asset: GeneratedMediaAsset) => {
    if (!asset.public_url) return;
    
    try {
      await navigator.clipboard.writeText(asset.public_url);
      toast.success('URL copied to clipboard!');
    } catch {
      toast.error('Failed to copy URL');
    }
  }, []);

  const clearHistory = useCallback(() => {
    setRecentGenerations([]);
    setCurrentResult(null);
    setProgress({ status: 'idle', progress: 0 });
  }, []);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-yellow-500" />
          AI Image Generator
        </CardTitle>
        <CardDescription>
          Generate images using Gemini Flash. Images are automatically saved to your project.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt</label>
          <Textarea
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={progress.status === 'generating'}
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => setPrompt(example)}
              >
                Example {i + 1}
              </Badge>
            ))}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Aspect Ratio</label>
          <Select
            value={aspectRatio}
            onValueChange={(v) => setAspectRatio(v as any)}
            disabled={progress.status === 'generating'}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{ratio.icon}</span>
                    {ratio.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || progress.status === 'generating'}
          className="w-full"
        >
          {progress.status === 'generating' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Image (~$0.03)
            </>
          )}
        </Button>

        {/* Progress Indicator */}
        {progress.status !== 'idle' && progress.status !== 'complete' && progress.status !== 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{progress.message || 'Processing...'}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {progress.status === 'error' && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {progress.message || 'Generation failed'}
          </div>
        )}

        <Separator />

        {/* Results Tabs */}
        <Tabs defaultValue="current">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Result</TabsTrigger>
            <TabsTrigger value="history">
              History
              {recentGenerations.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {recentGenerations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            {currentResult?.public_url ? (
              <div className="space-y-4">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={currentResult.public_url}
                    alt={currentResult.prompt || 'Generated image'}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(currentResult)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleShare(currentResult)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Copy URL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>Generated images will appear here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {recentGenerations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {recentGenerations.length} recent generations
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {recentGenerations.map((gen) => (
                      <div
                        key={gen.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          {gen.thumbnailUrl ? (
                            <img
                              src={gen.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover rounded"
                            />
                          ) : gen.status === 'generating' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : gen.status === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{gen.prompt}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(gen.createdAt).toLocaleTimeString()}
                            </span>
                            {gen.status === 'complete' && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-50" />
                <p>No generations yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
