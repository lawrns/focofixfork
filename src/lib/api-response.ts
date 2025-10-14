import { NextResponse } from 'next/server'

export function apiSuccess<T = any>(data: T, meta?: any) {
  return NextResponse.json({
    success: true,
    data,
    ...meta
  })
}

export function apiError(error: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
      data: null
    },
    { status }
  )
}
