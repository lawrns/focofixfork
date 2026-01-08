"use client"
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Script from 'next/script'

const Workbench = dynamic(() => import('@/components/voice/VoicePlanningWorkbench'), { ssr: false })
const ReviewPanel = dynamic(() => import('@/components/voice/PlanReviewPanel'), { ssr: false })
const Timeline = dynamic(() => import('@/components/voice/PlanTimeline'), { ssr: false })

export default function VoicePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary" />
            <div className="text-xl font-semibold">FOCO</div>
            <div className="text-sm text-muted-foreground">Speak your roadmap. Ship your future.</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><a href="/settings">Settings</a></Button>
            <Button variant="default" asChild><a href="/projects/new">New Project</a></Button>
          </div>
        </div>
        <div className="mt-6">
          {mounted && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Workbench />
            </motion.div>
          )}
        </div>
        <Script id="jsonld-voice" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'FOCO Voice Planning',
          operatingSystem: 'Web',
          applicationCategory: 'ProjectManagementApplication',
          description: 'AI-assisted voice to project plan with milestones and tasks'
        }) }} />
      </div>
    </div>
  )
}
