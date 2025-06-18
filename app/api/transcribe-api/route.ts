import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, createReadStream, unlinkSync, existsSync } from 'fs'
import OpenAI from 'openai'
import { join } from 'path'

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
    try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const model = formData.get('model') as string || 'whisper-1'

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided', success: false }, { status: 400 })
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 25MB.', success: false }, { status: 413 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured', success: false }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    const tempDir = process.env.TEMP || process.env.TMP || '/tmp'
    tempFilePath = join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`)
    
    writeFileSync(tempFilePath, new Uint8Array(await audioFile.arrayBuffer()))

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tempFilePath),
      model: model,
      response_format: "text",
    })

    const text = typeof transcription === 'string' ? transcription.trim() : (transcription as any).text?.trim() || ''
    return NextResponse.json({ text, success: true })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  } finally {
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError)
      }
    }
  }
}
