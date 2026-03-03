'use client';

/**
 * Mermaid Export Button Component
 * 
 * Button to export Mermaid diagrams as PNG/SVG/PDF
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Download, FileImage, FileCode, FileText, ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MermaidExportButtonProps {
  mermaidCode: string;
  diagramName?: string;
  projectId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'lg' | 'icon';
  className?: string;
  onExport?: (url: string, format: string) => void;
}

type ExportFormat = 'png' | 'svg' | 'pdf';

interface ExportSize {
  width: number;
  height: number;
  label: string;
}

const EXPORT_SIZES: ExportSize[] = [
  { width: 1200, height: 800, label: 'Standard (1200×800)' },
  { width: 1920, height: 1080, label: 'HD (1920×1080)' },
  { width: 2400, height: 1600, label: 'Large (2400×1600)' },
  { width: 800, height: 600, label: 'Small (800×600)' },
];

export function MermaidExportButton({
  mermaidCode,
  diagramName = 'diagram',
  projectId,
  variant = 'outline',
  size = 'sm',
  className,
  onExport,
}: MermaidExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [selectedSize, setSelectedSize] = useState<ExportSize>(EXPORT_SIZES[0]);
  const [customWidth, setCustomWidth] = useState('1200');
  const [customHeight, setCustomHeight] = useState('800');
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; format: string } | null>(null);

  const handleQuickExport = useCallback(async (quickFormat: ExportFormat) => {
    if (!mermaidCode.trim()) {
      toast.error('No diagram code to export');
      return;
    }

    setIsExporting(true);
    setFormat(quickFormat);

    try {
      const response = await fetch('/api/media/mermaid-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mermaidCode,
          format: quickFormat,
          projectId,
          diagramName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `${diagramName}.${quickFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onExport?.(result.downloadUrl, quickFormat);
      toast.success(`Exported as ${quickFormat.toUpperCase()}`);

    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [mermaidCode, projectId, diagramName, onExport]);

  const handleCustomExport = useCallback(async () => {
    if (!mermaidCode.trim()) {
      toast.error('No diagram code to export');
      return;
    }

    setIsExporting(true);

    try {
      const width = useCustomSize ? parseInt(customWidth) : selectedSize.width;
      const height = useCustomSize ? parseInt(customHeight) : selectedSize.height;

      const response = await fetch('/api/media/mermaid-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mermaidCode,
          format,
          width,
          height,
          projectId,
          diagramName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      setExportResult({ url: result.downloadUrl, format });
      setShowDialog(false);

      // Trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `${diagramName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onExport?.(result.downloadUrl, format);
      toast.success(`Exported as ${format.toUpperCase()}`);

    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [mermaidCode, format, selectedSize, customWidth, customHeight, useCustomSize, projectId, diagramName, onExport]);

  const getFormatIcon = (fmt: ExportFormat) => {
    switch (fmt) {
      case 'png':
        return <FileImage className="h-4 w-4" />;
      case 'svg':
        return <FileCode className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn(className)}
            disabled={isExporting || !mermaidCode.trim()}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
            <ChevronDown className="ml-2 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleQuickExport('png')}>
            <FileImage className="mr-2 h-4 w-4" />
            PNG Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('svg')}>
            <FileCode className="mr-2 h-4 w-4" />
            SVG Vector
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            PDF Document
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowDialog(true)}>
            <Download className="mr-2 h-4 w-4" />
            Custom Export...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Export Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Diagram</DialogTitle>
            <DialogDescription>
              Customize the export format and dimensions for your diagram.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as ExportFormat)}
                className="flex gap-4"
              >
                {(['png', 'svg', 'pdf'] as ExportFormat[]).map((fmt) => (
                  <div key={fmt} className="flex items-center space-x-2">
                    <RadioGroupItem value={fmt} id={`format-${fmt}`} />
                    <Label
                      htmlFor={`format-${fmt}`}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      {getFormatIcon(fmt)}
                      <span className="uppercase">{fmt}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <Label>Size</Label>
              {!useCustomSize ? (
                <RadioGroup
                  value={selectedSize.label}
                  onValueChange={(label) => {
                    const size = EXPORT_SIZES.find((s) => s.label === label);
                    if (size) setSelectedSize(size);
                  }}
                  className="grid grid-cols-1 gap-2"
                >
                  {EXPORT_SIZES.map((size) => (
                    <div key={size.label} className="flex items-center space-x-2">
                      <RadioGroupItem value={size.label} id={`size-${size.label}`} />
                      <Label
                        htmlFor={`size-${size.label}`}
                        className="cursor-pointer text-sm"
                      >
                        {size.label}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="size-custom" />
                    <Label
                      htmlFor="size-custom"
                      className="cursor-pointer text-sm"
                      onClick={() => setUseCustomSize(true)}
                    >
                      Custom size
                    </Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="width" className="text-xs">Width (px)</Label>
                      <Input
                        id="width"
                        type="number"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(e.target.value)}
                        min="100"
                        max="4000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="height" className="text-xs">Height (px)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(e.target.value)}
                        min="100"
                        max="4000"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseCustomSize(false)}
                  >
                    Use preset sizes
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCustomExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      {exportResult && (
        <Dialog open={!!exportResult} onOpenChange={() => setExportResult(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Export Complete
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Your diagram has been exported as a{' '}
                <strong>{exportResult.format.toUpperCase()}</strong> file.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(exportResult.url);
                  toast.success('URL copied to clipboard');
                }}
              >
                Copy URL
              </Button>
              <Button onClick={() => setExportResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
