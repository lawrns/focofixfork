'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ReportRecord = {
  id: string
  title: string
  report_type: string
  project_id: string | null
  data: Record<string, any> | null
  created_at: string | null
}

export default function ReportDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const [report, setReport] = useState<ReportRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((json) => setReport((json?.data?.report ?? null) as ReportRecord | null))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <PageShell className="space-y-6">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" />
        Back to Reports
      </Link>

      {loading ? (
        <div className="flex items-center justify-center min-h-[260px]">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[color:var(--foco-teal)]" />
        </div>
      ) : !report ? (
        <div className="min-h-[260px] flex items-center justify-center text-sm text-muted-foreground">Report not found.</div>
      ) : (
        <>
          <PageHeader
            title={report.title}
            subtitle="Structured project report artifact"
            primaryAction={<Badge variant="outline">{report.report_type}</Badge>}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {report.data?.executive_summary ?? report.data?.summary ?? 'No summary available.'}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Recommended Direction</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{report.data?.recommended_direction?.narrative ?? 'No recommendation available.'}</p>
                {(report.data?.recommended_direction?.next_steps ?? []).length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {((report.data?.recommended_direction?.next_steps ?? []) as string[]).map((step, index) => (
                      <li key={`${step}-${index}`}>• {step}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Raw Report Data</CardTitle></CardHeader>
            <CardContent>
              <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(report.data ?? {}, null, 2)}</pre>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  )
}
