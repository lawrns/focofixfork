/**
 * Export Service
 * Handles data export to CSV, Excel, and other formats
 */

export class ExportService {
  /**
   * Convert data to CSV format
   */
  static toCSV(data: any[], headers?: string[]): string {
    if (!data || data.length === 0) return ''

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0])

    // Create CSV header row
    const headerRow = csvHeaders.join(',')

    // Create data rows
    const dataRows = data.map(row => {
      return csvHeaders.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '')
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue
      }).join(',')
    })

    return [headerRow, ...dataRows].join('\n')
  }

  /**
   * Download CSV file
   */
  static downloadCSV(data: any[], filename: string, headers?: string[]) {
    const csv = this.toCSV(data, headers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Convert data to Excel-compatible HTML table
   * This creates an HTML table that Excel can import
   */
  static toExcelHTML(data: any[], headers?: string[]): string {
    if (!data || data.length === 0) return ''

    const excelHeaders = headers || Object.keys(data[0])

    let html = '<table>'

    // Add headers
    html += '<thead><tr>'
    excelHeaders.forEach(header => {
      html += `<th>${this.escapeHTML(header)}</th>`
    })
    html += '</tr></thead>'

    // Add data rows
    html += '<tbody>'
    data.forEach(row => {
      html += '<tr>'
      excelHeaders.forEach(header => {
        const value = row[header]
        html += `<td>${this.escapeHTML(String(value ?? ''))}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody></table>'

    return html
  }

  /**
   * Download Excel file (as HTML table)
   */
  static downloadExcel(data: any[], filename: string, headers?: string[]) {
    const html = this.toExcelHTML(data, headers)
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Download JSON file
   */
  static downloadJSON(data: any, filename: string) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHTML(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Format date for export
   */
  static formatDate(date: Date | string | null): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
  }

  /**
   * Format datetime for export
   */
  static formatDateTime(date: Date | string | null): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().replace('T', ' ').split('.')[0]
  }
}

export const exportService = ExportService
