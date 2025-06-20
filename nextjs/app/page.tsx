"use client"

import { useState } from "react"
import { Navbar, type TranscriptionMethod, type ModelType } from "@/components/Navbar"
import { Chatbot } from "@/components/Chatbot"

export default function Home() {
  const [transcriptionMethod, setTranscriptionMethod] = useState<TranscriptionMethod>('local')
  const [selectedModel, setSelectedModel] = useState<ModelType>('whisper-1')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar
        transcriptionMethod={transcriptionMethod}
        onTranscriptionMethodChange={setTranscriptionMethod}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
      <div className="flex-1 overflow-hidden">
        <Chatbot
          transcriptionMethod={transcriptionMethod}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  )
}