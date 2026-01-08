import type { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://foco.mx'
  const urls: string[] = ['/', '/dashboard', '/projects', '/tasks', '/organizations']
  const redirectsPath = path.join(process.cwd(), 'legacy-redirects.json')
  const legacy: Array<{ source: string; destination: string }> = fs.existsSync(redirectsPath)
    ? JSON.parse(fs.readFileSync(redirectsPath, 'utf8'))
    : []
  const pages = [...urls, ...legacy.map(r => r.destination)]
  const now = new Date()
  return pages.map(u => ({ url: `${base}${u}`, lastModified: now }))
}
