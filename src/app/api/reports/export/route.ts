import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'csv'
    const type = searchParams.get('type') || 'overview'
    const range = searchParams.get('range') || '30d'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get date range
    const days = parseInt(range.replace('d', ''))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch data based on type
    let data: any[] = []
    let headers: string[] = []

    if (type === 'overview' || type === 'projects') {
      // Fetch projects
      const { data: projects } = await supabase
        .from('projects')
        .select('name, status, priority, start_date, end_date, created_at')
        .gte('created_at', startDate.toISOString())

      data = projects || []
      headers = ['name', 'status', 'priority', 'start_date', 'end_date', 'created_at']
    } else if (type === 'tasks') {
      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status, priority, due_date, created_at')
        .gte('created_at', startDate.toISOString())

      data = tasks || []
      headers = ['title', 'status', 'priority', 'due_date', 'created_at']
    } else if (type === 'performance') {
      // Fetch team performance data (simplified)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('assigned_to, status, created_at')
        .gte('created_at', startDate.toISOString())

      data = tasks || []
      headers = ['assigned_to', 'status', 'created_at']
    }

    // Generate export based on format
    if (format === 'csv') {
      const csv = generateCSV(data, headers)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${type}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (format === 'excel') {
      const excel = generateExcel(data, headers)
      return new NextResponse(excel, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="report-${type}-${new Date().toISOString().split('T')[0]}.xls"`
        }
      })
    } else if (format === 'pdf') {
      const pdf = await generatePDF(data, headers, type)
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="report-${type}-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error generating export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return headers.join(',')

  const headerRow = headers.join(',')
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      const stringValue = String(value ?? '')
      return stringValue.includes(',') || stringValue.includes('"')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

function generateExcel(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return '<table></table>'

  let html = '<table>'
  html += '<thead><tr>'
  headers.forEach(header => {
    html += `<th>${escapeHTML(header)}</th>`
  })
  html += '</tr></thead><tbody>'

  data.forEach(row => {
    html += '<tr>'
    headers.forEach(header => {
      const value = row[header]
      html += `<td>${escapeHTML(String(value ?? ''))}</td>`
    })
    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

async function generatePDF(data: any[], headers: string[], type: string): Promise<Buffer> {
  // For now, create a simple text-based PDF-like output
  // In production, you'd use a library like puppeteer, pdfkit, or jsPDF
  let content = `${type.toUpperCase()} REPORT\n`
  content += `Generated: ${new Date().toISOString()}\n\n`

  if (data.length === 0) {
    content += 'No data available for the selected criteria.\n'
  } else {
    // Add headers
    content += headers.join('\t') + '\n'
    content += '='.repeat(headers.join('\t').length) + '\n'

    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => String(row[header] ?? ''))
      content += values.join('\t') + '\n'
    })

    content += `\nTotal Records: ${data.length}\n`
  }

  // Convert to Buffer (simulating PDF content)
  // In a real implementation, you'd generate actual PDF bytes
  return Buffer.from(content, 'utf-8')
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
