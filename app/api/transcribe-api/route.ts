import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  
  try {    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const model = formData.get('model') as string || 'gpt-4o-transcribe'

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
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', success: false },
        { status: 500 }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Create temporary file
    const tempDir = process.env.TEMP || process.env.TMP || '/tmp'
    tempFilePath = path.join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`)
      // Save uploaded file to temporary location
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(tempFilePath, new Uint8Array(buffer))

    // Create transcription using OpenAI SDK
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: model as 'whisper-1' | 'gpt-4o-transcribe',
      response_format: "text",
    })

    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
      tempFilePath = null
    }

    const text = typeof transcription === 'string' ? transcription.trim() : (transcription as any).text?.trim() || ''

    return NextResponse.json({ text, success: true })

  } catch (error) {
    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError)
      }
    }

    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
