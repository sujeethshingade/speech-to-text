"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Message } from "@/lib/types"

export function Chatbot() {
    const [messages, setMessages] = useState<Message[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [message, setMessage] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Add a new message to the chat
    const handleSendMessage = (text: string) => {
        const newMessage: Message = { id: Date.now().toString(), text, isUser: true }
        setMessages(prev => [...prev, newMessage])

        // Simulate AI response (replace with actual AI integration)
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: `Received your message: "${text}". This is a demo response.`,
                isUser: false,
            }
            setMessages(prev => [...prev, aiResponse])
        }, 1000)
    }

    // Send audio to backend for transcription
    const transcribeAudio = async (audioBlob: Blob) => {
        try {
            setIsTranscribing(true)
            const formData = new FormData()
            formData.append("audio", audioBlob, "recording.webm")

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            if (!data.success) throw new Error(data.error || "Transcription failed")
            return data.text?.trim() || ""
        } catch (error) {
            console.error("Transcription error:", error)
            return ""
        } finally {
            setIsTranscribing(false)
        }
    }

    // Send text message
    const sendTextMessage = () => {
        if (message.trim() && !isTranscribing) {
            handleSendMessage(message.trim())
            setMessage("")
        }
    }

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendTextMessage()
        }
    }

    // Start voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            // Collect audio data chunks
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data)
            }

            // Process recording when stopped
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
                const text = await transcribeAudio(audioBlob)
                if (text) setMessage(text)
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (error) {
            console.error("Recording error:", error)
            alert("Could not access microphone. Please check permissions.")
        }
    }

    // Stop voice recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    // Toggle recording state
    const toggleRecording = () => {
        if (isTranscribing) return
        isRecording ? stopRecording() : startRecording()
    }

    // Chat bubble component
    const ChatBubble = ({ message, isUser }: { message: string; isUser: boolean }) => (
        <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[80%] rounded-full px-4 py-3 text-sm shadow-sm",
                isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900 border border-gray-200")}>
                <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 relative flex items-center gap-2 p-4 border-t bg-background">
                <div className="flex-1 flex items-center gap-2">
                    {/* Text input */}
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={
                            isRecording ? "Recording... Click mic to stop"
                                : isTranscribing ? "Processing your voice..."
                                    : "Ask anything..."
                        }
                        disabled={isTranscribing}
                        className="flex-1"
                    />

                    {/* Voice recording button */}
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={toggleRecording}
                        disabled={isTranscribing}
                        className={cn(
                            "transition-all duration-200",
                            isRecording && "bg-red-500 text-white hover:bg-red-600 hover:text-white border-red-500 animate-pulse",
                            isTranscribing && "opacity-50",
                            !isRecording && "text-gray-900 hover:bg-gray-100"
                        )}
                    >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>

                    {/* Send button */}
                    <Button
                        size="icon"
                        onClick={sendTextMessage}
                        disabled={!message.trim() || isTranscribing}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Recording indicator */}
                {isRecording && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            Recording...
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
