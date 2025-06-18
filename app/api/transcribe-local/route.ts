import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const flaskFormData = new FormData()
    flaskFormData.append('audio', audioFile)

    const flaskUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:5328/api/transcribe'
      : '/api/transcribe'

    const response = await fetch(flaskUrl, {
      method: 'POST',
      body: flaskFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Flask error response:', errorText)
      return NextResponse.json(
        { error: `Local transcription service unavailable: ${errorText}`, success: false },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Local transcription error:', error)
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Flask server is not running. Please start it with: npm run flask-dev', success: false },
        { status: 503 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
