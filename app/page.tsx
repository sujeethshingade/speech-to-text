"use client"

import { useState, useRef, useEffect } from "react"
import { ChatBubble } from "@/components/chat-bubble"
import { ChatInput } from "@/components/chat-input"

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, newMessage])

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I received your message: \"" + text + "\". This is a demo response. In a real application, this would be processed by an AI model.",
        isUser: false,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleAudioTranscribe = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const data = await response.json()

      // Return the transcribed text instead of sending it automatically
      return data.text && data.text.trim() ? data.text : ""
    } catch (error) {
      console.error("Transcription error:", error)
      return ""
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <h1 className="text-xl font-semibold text-foreground">
          Speech-to-Text Chatbot
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message.text}
            isUser={message.isUser}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onAudioTranscribe={handleAudioTranscribe}
        isRecording={isRecording}
      />
    </div>
  )
}
