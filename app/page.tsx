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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. You can type a message or click the microphone to record your voice.",
      isUser: false,
      timestamp: new Date().toISOString(),
    },
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
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
    setIsTranscribing(true)

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

      if (data.text && data.text.trim()) {
        handleSendMessage(data.text)
      } else {
        // Show error message if no text was transcribed
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: "Sorry, I couldn't understand the audio. Please try again.",
          isUser: false,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error("Transcription error:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Sorry, there was an error processing your voice message. Please try again.", // THIS IS THE ERROR MESSAGE
        isUser: false,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
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
            timestamp={message.timestamp}
          />
        ))}

        {isTranscribing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
                <span>Transcribing audio...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onAudioTranscribe={handleAudioTranscribe}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
      />
    </div>
  )
}
