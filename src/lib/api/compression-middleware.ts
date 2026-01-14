import { NextResponse } from 'next/server'

export function withCompression(handler: Function) {
  return async (...args: any[]) => {
    const response = await handler(...args)

    if (!response || !(response instanceof NextResponse)) {
      return response
    }

    const acceptEncoding = args[0]?.headers?.get('accept-encoding') || ''

    if (acceptEncoding.includes('gzip') || acceptEncoding.includes('br')) {
      response.headers.set('Content-Encoding', 'gzip')
      response.headers.set('Vary', 'Accept-Encoding')
    }

    return response
  }
}

export function withCacheHeaders(
  handler: Function,
  options: {
    maxAge?: number
    sMaxAge?: number
    staleWhileRevalidate?: number
  } = {}
) {
  const {
    maxAge = 60,
    sMaxAge = 120,
    staleWhileRevalidate = 300,
  } = options

  return async (...args: any[]) => {
    const response = await handler(...args)

    if (!response || !(response instanceof NextResponse)) {
      return response
    }

    if (response.status === 200) {
      response.headers.set(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      )
    }

    return response
  }
}
