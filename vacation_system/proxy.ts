// middleware.ts or middleware.js
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // 1. Determine the allowed ancestors based on the environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  const framePolicy = isDevelopment
    ? "frame-ancestors 'self' *" // Loose rules for local development and testing
    : `frame-ancestors 'self' ${process.env.SAC_FRONTEND_URL}`; // Strict rule for production

  // 2. Set the Content-Security-Policy header dynamically
  response.headers.set(
    'Content-Security-Policy',
    framePolicy
  )

  return response
}