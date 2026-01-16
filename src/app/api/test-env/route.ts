import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Log all environment variables (without sensitive data)
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      AI_PROVIDER: process.env.AI_PROVIDER,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? `***${process.env.DEEPSEEK_API_KEY.slice(-4)}` : 'undefined',
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
      DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      // List all environment variables that start with specific prefixes
      allEnvVars: Object.keys(process.env).filter(key => 
        key.startsWith('AI_') || 
        key.startsWith('DEEPSEEK_') || 
        key.startsWith('OPENAI_') ||
        key.startsWith('NEXT_PUBLIC_')
      )
    }
    
    // Test if we can import OpenAI
    let openaiTest = 'success'
    try {
      const OpenAI = require('openai').default
      openaiTest = 'OpenAI imported successfully'
    } catch (error) {
      openaiTest = `Failed to import OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    
    return NextResponse.json({
      success: true,
      environment: envVars,
      openaiTest,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
