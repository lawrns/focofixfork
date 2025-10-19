'use client'

import { useState } from 'react'
import { Camera, Palette, Image, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardCover, CoverType, GRADIENT_PRESETS, COLOR_PRESETS, getCoverStyle, validateCoverData } from '@/lib/models/card-cover'
import { cn } from '@/lib/utils'

interface CardCoverSelectorProps {
  currentCover: CardCover | null
  onCoverChange: (cover: CardCover | null) => void
  className?: string
}

export function CardCoverSelector({ 
  currentCover, 
  onCoverChange, 
  className 
}: CardCoverSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'colors' | 'gradients' | 'upload' | 'unsplash'>('colors')
  const [customColor, setCustomColor] = useState('#3b82f6')
  const [imageUrl, setImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleColorSelect = (color: string) => {
    const newCover: CardCover = {
      id: `color-${Date.now()}`,
      task_id: '', // Will be set by parent
      cover_type: 'color',
      cover_data: color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    onCoverChange(newCover)
    setIsOpen(false)
  }

  const handleGradientSelect = (gradient: string) => {
    const newCover: CardCover = {
      id: `gradient-${Date.now()}`,
      task_id: '', // Will be set by parent
      cover_type: 'gradient',
      cover_data: gradient,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    onCoverChange(newCover)
    setIsOpen(false)
  }

  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    try {
      // In a real implementation, this would upload to a file service
      // For now, we'll create a data URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const newCover: CardCover = {
          id: `image-${Date.now()}`,
          task_id: '', // Will be set by parent
          cover_type: 'image',
          cover_data: dataUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        onCoverChange(newCover)
        setIsOpen(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) return

    if (!validateCoverData('image', imageUrl)) {
      alert('Please enter a valid image URL')
      return
    }

    const newCover: CardCover = {
      id: `image-${Date.now()}`,
      task_id: '', // Will be set by parent
      cover_type: 'image',
      cover_data: imageUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    onCoverChange(newCover)
    setIsOpen(false)
  }

  const handleRemoveCover = () => {
    onCoverChange(null)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn('gap-2', className)}
      >
        <Camera className="w-4 h-4" />
        {currentCover ? 'Change Cover' : 'Add Cover'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {currentCover ? 'Change Card Cover' : 'Add Card Cover'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="gradients" className="flex items-center gap-2">
                <Image className="w-4 h-4" aria-hidden="true" />
                Gradients
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="unsplash" className="flex items-center gap-2">
                <Image className="w-4 h-4" aria-hidden="true" />
                Photos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleColorSelect(preset.data)}
                    className="aspect-square rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: preset.data }}
                    title={preset.name}
                  />
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-color">Custom Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-color"
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Button 
                    onClick={() => handleColorSelect(customColor)}
                    className="flex-1"
                  >
                    Use Custom Color
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gradients" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleGradientSelect(preset.data)}
                    className="aspect-video rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors relative overflow-hidden"
                    style={{ background: preset.data }}
                    title={preset.name}
                  >
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-sm font-medium">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-4">Upload an image file</p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleImageUpload(file)
                      }
                    }}
                    className="max-w-xs mx-auto"
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-url">Or enter image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image-url"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <Button 
                      onClick={handleUrlSubmit}
                      disabled={!imageUrl.trim()}
                    >
                      Use URL
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="unsplash" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" aria-hidden="true" />
                <p className="text-sm">Unsplash integration coming soon!</p>
                <p className="text-xs text-gray-400 mt-1">
                  Browse thousands of high-quality photos for your cards
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleRemoveCover}
              disabled={!currentCover}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              Remove Cover
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface CardCoverDisplayProps {
  cover: CardCover | null
  className?: string
  size?: 'full' | 'half'
}

export function CardCoverDisplay({ 
  cover, 
  className, 
  size = 'full' 
}: CardCoverDisplayProps) {
  if (!cover) return null

  const coverStyle = getCoverStyle(cover)
  const height = size === 'full' ? 'h-32' : 'h-16'

  return (
    <div
      className={cn(
        'w-full rounded-t-lg relative overflow-hidden',
        height,
        className
      )}
      style={coverStyle}
    >
      {/* Gradient overlay for text readability */}
      {cover.cover_type === 'image' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      )}
    </div>
  )
}
