'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  FileText,
  Upload,
  X,
  Check,
  Loader2,
  File,
  FileType,
  Trash2,
  Sparkles
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Proposal } from '@/types/proposals'

// ============================================================================
// Types
// ============================================================================

interface CreateProposalModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onCreated: (proposal: Proposal) => void
}

interface ExtractedItem {
  type: 'task' | 'milestone' | 'project'
  title: string
  description?: string
  confidence: number
}

type InputMode = 'voice' | 'text' | 'file'
type ProcessingState = 'idle' | 'recording' | 'transcribing' | 'uploading' | 'processing' | 'success' | 'error'

// ============================================================================
// Animation Variants
// ============================================================================

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
}

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
}

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

const checkmarkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

const shimmerVariants = {
  shimmer: {
    x: ['-100%', '100%'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

// ============================================================================
// Waveform Component
// ============================================================================

function WaveformVisualizer({ isRecording }: { isRecording: boolean }) {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0.2))

  useEffect(() => {
    if (!isRecording) {
      setBars(Array(20).fill(0.2))
      return
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8))
    }, 100)

    return () => clearInterval(interval)
  }, [isRecording])

  return (
    <div className="flex items-center justify-center gap-0.5 h-16">
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="w-1 bg-primary rounded-full"
          animate={{
            height: `${height * 100}%`,
            opacity: isRecording ? 1 : 0.3
          }}
          transition={{ duration: 0.1 }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Recording Button Component
// ============================================================================

function RecordingButton({
  isRecording,
  onToggle,
  disabled
}: {
  isRecording: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <motion.button
      className={cn(
        'relative w-20 h-20 rounded-full flex items-center justify-center',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isRecording
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onToggle}
      disabled={disabled}
      animate={isRecording ? 'pulse' : undefined}
      variants={pulseVariants}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer pulse ring when recording */}
      {isRecording && (
        <motion.div
          className="absolute inset-0 rounded-full bg-destructive/30"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      )}

      {isRecording ? (
        <MicOff className="h-8 w-8" />
      ) : (
        <Mic className="h-8 w-8" />
      )}
    </motion.button>
  )
}

// ============================================================================
// Processing Shimmer Component
// ============================================================================

function ProcessingShimmer() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-muted/50 p-6">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        variants={shimmerVariants}
        animate="shimmer"
      />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    </div>
  )
}

// ============================================================================
// Success Checkmark Component
// ============================================================================

function SuccessCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      className="flex items-center justify-center"
    >
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <motion.svg
          className="w-10 h-10 text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M5 12l5 5L20 7"
            variants={checkmarkVariants}
            initial="hidden"
            animate="visible"
          />
        </motion.svg>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Extracted Items Preview Component
// ============================================================================

function ExtractedItemsPreview({ items }: { items: ExtractedItem[] }) {
  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Extracted Items
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card"
          >
            <Badge variant="secondary" className="text-xs">
              {item.type}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(item.confidence * 100)}%
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// File Upload Section Component
// ============================================================================

interface UploadedFile {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
}

function FileUploadSection({
  onFilesSelected,
  uploadedFiles,
  onRemoveFile,
  disabled
}: {
  onFilesSelected: (files: File[]) => void
  uploadedFiles: UploadedFile[]
  onRemoveFile: (index: number) => void
  disabled: boolean
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = '.txt,.md,.pdf,.docx'

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      return acceptedTypes.includes(ext)
    })

    if (files.length > 0) {
      onFilesSelected(files)
    }
  }, [onFilesSelected])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return <FileType className="h-4 w-4 text-red-500" />
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />
      default:
        return <File className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-medium mb-1">
          {isDragOver ? 'Drop files here' : 'Upload Files'}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Drag and drop files here, or click to browse
        </p>
        <div className="text-xs text-muted-foreground">
          Accepted: .txt, .md, .pdf, .docx
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {uploadedFiles.map((uploadedFile, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {getFileIcon(uploadedFile.file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadedFile.status === 'uploading' && (
                    <Progress value={uploadedFile.progress} className="mt-2 h-1" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'completed' && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  {uploadedFile.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(index)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={uploadedFile.status === 'uploading'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CreateProposalModal({
  isOpen,
  onClose,
  projectId,
  onCreated
}: CreateProposalModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<InputMode>('text')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [textContent, setTextContent] = useState('')
  const [transcription, setTranscription] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('text')
      setProcessingState('idle')
      setTextContent('')
      setTranscription('')
      setIsRecording(false)
      setUploadedFiles([])
      setExtractedItems([])
      setProgress(0)
      setError(null)
    }
  }, [isOpen])

  // Voice Recording Handlers
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())

        // Simulate transcription
        setProcessingState('transcribing')
        await simulateTranscription(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setProcessingState('recording')
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.')
      console.error('Error accessing microphone:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // Simulated transcription (replace with actual API call)
  const simulateTranscription = async (_audioBlob: Blob) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    setTranscription('This is a simulated transcription of your voice recording. In production, this would be the actual transcribed text from the audio.')
    setProcessingState('idle')
  }

  // File Upload Handlers
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newUploads: UploadedFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploadedFiles(prev => [...prev, ...newUploads])

    // Simulate upload progress for each file
    for (let i = 0; i < files.length; i++) {
      const fileIndex = uploadedFiles.length + i

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setUploadedFiles(prev =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, progress } : f
          )
        )
      }

      // Mark as completed
      setUploadedFiles(prev =>
        prev.map((f, idx) =>
          idx === fileIndex ? { ...f, status: 'completed' as const } : f
        )
      )
    }
  }, [uploadedFiles.length])

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Process Content
  const processContent = useCallback(async () => {
    let content = ''

    if (activeTab === 'text') {
      content = textContent
    } else if (activeTab === 'voice') {
      content = transcription
    } else if (activeTab === 'file') {
      content = uploadedFiles.map(f => f.file.name).join(', ')
    }

    if (!content.trim() && uploadedFiles.length === 0) {
      setError('Please provide some content to process.')
      return
    }

    setError(null)
    setProcessingState('processing')
    setProgress(0)

    // Simulate AI processing
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 10
      })
    }, 300)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000))

      clearInterval(progressInterval)
      setProgress(100)

      // Simulate extracted items
      const simulatedItems: ExtractedItem[] = [
        { type: 'task', title: 'Review proposal requirements', confidence: 0.95 },
        { type: 'task', title: 'Create implementation plan', confidence: 0.88 },
        { type: 'milestone', title: 'Initial Review Complete', confidence: 0.82 }
      ]
      setExtractedItems(simulatedItems)
      setProcessingState('success')

      // Create proposal after short delay
      setTimeout(() => {
        const mockProposal: Proposal = {
          id: crypto.randomUUID(),
          workspace_id: '',
          project_id: projectId,
          title: 'New Proposal',
          description: content,
          status: 'draft',
          source_type: activeTab === 'voice' ? 'voice' : 'text',
          created_by: '',
          submitted_at: null,
          approved_by: null,
          approved_at: null,
          rejected_by: null,
          rejected_at: null,
          applied_by: null,
          applied_at: null,
          metadata: { extracted_items: simulatedItems },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        onCreated(mockProposal)
      }, 1500)
    } catch (err) {
      clearInterval(progressInterval)
      setError('Failed to process content. Please try again.')
      setProcessingState('error')
    }
  }, [activeTab, textContent, transcription, uploadedFiles, projectId, onCreated])

  // Check if we can submit
  const canSubmit = () => {
    if (processingState !== 'idle' && processingState !== 'error') return false

    if (activeTab === 'text') return textContent.trim().length > 0
    if (activeTab === 'voice') return transcription.trim().length > 0
    if (activeTab === 'file') return uploadedFiles.some(f => f.status === 'completed')

    return false
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Proposal
            </DialogTitle>
            <DialogDescription>
              Add content using voice, text, or file upload. AI will extract actionable items.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            {/* Processing State */}
            {processingState === 'processing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <ProcessingShimmer />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing content...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {processingState === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <SuccessCheckmark />
                <p className="text-center text-sm text-muted-foreground">
                  Proposal created successfully!
                </p>
                <ExtractedItemsPreview items={extractedItems} />
              </motion.div>
            )}

            {/* Input Tabs */}
            {(processingState === 'idle' || processingState === 'error' || processingState === 'recording' || processingState === 'transcribing') && (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InputMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="voice" className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Voice
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  {/* Voice Input Tab */}
                  <TabsContent value="voice" className="mt-4">
                    <motion.div
                      key="voice"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-6"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <WaveformVisualizer isRecording={isRecording} />

                        <RecordingButton
                          isRecording={isRecording}
                          onToggle={toggleRecording}
                          disabled={processingState === 'transcribing'}
                        />

                        <p className="text-sm text-muted-foreground">
                          {isRecording
                            ? 'Recording... Click to stop'
                            : processingState === 'transcribing'
                              ? 'Transcribing...'
                              : 'Click to start recording'
                          }
                        </p>

                        {processingState === 'transcribing' && (
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing audio...
                          </div>
                        )}
                      </div>

                      {/* Transcription Preview */}
                      {transcription && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <h4 className="text-sm font-medium">Transcription</h4>
                          <div className="p-3 rounded-lg bg-muted/50 text-sm">
                            {transcription}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </TabsContent>

                  {/* Text Input Tab */}
                  <TabsContent value="text" className="mt-4">
                    <motion.div
                      key="text"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-4"
                    >
                      <Textarea
                        placeholder="Enter your proposal content here. You can use Markdown for formatting..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        className="min-h-[200px] resize-none"
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Markdown supported
                      </div>
                    </motion.div>
                  </TabsContent>

                  {/* File Upload Tab */}
                  <TabsContent value="file" className="mt-4">
                    <motion.div
                      key="file"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <FileUploadSection
                        onFilesSelected={handleFilesSelected}
                        uploadedFiles={uploadedFiles}
                        onRemoveFile={handleRemoveFile}
                        disabled={processingState !== 'idle' && processingState !== 'error'}
                      />
                    </motion.div>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={processContent}
              disabled={!canSubmit()}
              className="min-w-[120px]"
            >
              {processingState === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Proposal
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateProposalModal
