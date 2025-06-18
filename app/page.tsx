"use client"

import { useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Chatbot } from "@/components/Chatbot"

type TranscriptionMethod = 'local' | 'api'

export default function Home() {
  const [transcriptionMethod, setTranscriptionMethod] = useState<TranscriptionMethod>('local')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar
        transcriptionMethod={transcriptionMethod}
        onTranscriptionMethodChange={setTranscriptionMethod}
      />
      <div className="flex-1 overflow-hidden">
        <Chatbot
          transcriptionMethod={transcriptionMethod}
        />
      </div>
    </div>
  )
}