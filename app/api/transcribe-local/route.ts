import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', success: false },
        { status: 400 }
      )
    }

    // Check file size (25MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.', success: false },
        { status: 413 }
      )
    }    // Forward to Flask backend (existing local Whisper implementation)
    const flaskFormData = new FormData()
    flaskFormData.append('audio', audioFile)

    const flaskUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:5328/api/transcribe'
      : '/api/transcribe'

    console.log('Forwarding to Flask at:', flaskUrl)

    const response = await fetch(flaskUrl, {
      method: 'POST',
      body: flaskFormData
    })

    console.log('Flask response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Flask error response:', errorText)
      return NextResponse.json(
        { error: `Local transcription service unavailable: ${errorText}`, success: false },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Local transcription error:', error)
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Flask server is not running. Please start it with: npm run flask-dev', success: false },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
