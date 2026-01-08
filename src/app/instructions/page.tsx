"use client"
import { useState } from 'react'
import Script from 'next/script'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Page() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Request failed')
      setResult(json.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <Script id="jsonld-instructions" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'AI Instruction to Plan',
          description: 'Convert instructions into milestones and tasks',
          step: [
            { '@type': 'HowToStep', name: 'Enter instruction' },
            { '@type': 'HowToStep', name: 'Generate plan' },
            { '@type': 'HowToStep', name: 'Review and commit' }
          ]
        }) }} />
        <h1 className="text-2xl font-semibold">Instruction Processor</h1>
        <Card>
          <CardHeader>
            <CardTitle>Enter Instruction</CardTitle>
            <CardDescription>Describe the project. We will generate milestones and tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea className="w-full h-40 rounded-md border bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder="Enter instructions" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex items-center gap-2">
              <Button onClick={submit} disabled={loading || !text.trim()}>{loading ? 'Processing...' : 'Generate Plan'}</Button>
              <Input placeholder="Owner" className="max-w-[180px]" />
            </div>
          </CardContent>
        </Card>
        {error && <div className="text-red-600">{error}</div>}
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card>
                <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tasks.map((t: any) => (
                      <li key={t.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{t.title}</span>
                          <span className="text-sm">{t.priority}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Milestones</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.milestones.map((m: any) => (
                      <li key={m.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m.title}</span>
                          <span className="text-sm">{m.deadline || m.dueInDays + ' days'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.timeline.map((e: any) => (
                      <li key={e.taskId} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Task</span>
                          <span className="text-sm">{e.startOffsetDays} → {e.durationDays}d</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
