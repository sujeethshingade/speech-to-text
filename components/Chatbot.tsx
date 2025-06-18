"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    text: string
    isUser: boolean
}

interface ChatbotProps {
    transcriptionMethod?: 'local' | 'api'
}

export function Chatbot({ transcriptionMethod = 'local' }: ChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [message, setMessage] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const addMessage = (text: string, isUser: boolean) => {
        setMessages(prev => [...prev, { id: Date.now().toString() + isUser, text, isUser }])
    }

    const handleSendMessage = (text: string) => {
        addMessage(text, true)
        setTimeout(() => addMessage(`Received your message: "${text}". This is a demo response.`, false), 1000)
    }

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true)
        try {
            const formData = new FormData()
            formData.append("audio", audioBlob, "recording.webm")

            const response = await fetch(`/api/transcribe-${transcriptionMethod}`, {
                method: "POST",
                body: formData
            })

            if (!response.ok) throw new Error(`HTTP ${response.status}`)
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

    const sendTextMessage = () => {
        const trimmed = message.trim()
        if (trimmed && !isTranscribing) {
            handleSendMessage(trimmed)
            setMessage("")
        }
    }

    const toggleRecording = async () => {
        if (isTranscribing) return

        if (isRecording) {
            mediaRecorderRef.current?.stop()
            setIsRecording(false)
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data)
            }

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

    const placeholder = isRecording ? "Recording... Click on mic to stop" :
        isTranscribing ? `Processing with ${transcriptionMethod === 'local' ? 'Local' : 'API'}...` :
            "Ask anything..."

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex w-full", msg.isUser ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[80%] rounded-full px-4 py-3 text-sm shadow-sm",
                            msg.isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900 border border-gray-200"
                        )}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 relative flex items-center gap-2 p-4 border-t bg-background">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendTextMessage())}
                    placeholder={placeholder}
                    disabled={isTranscribing}
                    className="flex-1"
                />

                <Button
                    size="icon"
                    variant="outline"
                    onClick={toggleRecording}
                    disabled={isTranscribing}
                    className={cn(
                        "transition-all duration-200 text-gray-900",
                        isRecording && "bg-red-500 text-white hover:bg-red-600 border-red-500 animate-pulse",
                        isTranscribing && "opacity-50"
                    )}
                >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <Button
                    size="icon"
                    onClick={sendTextMessage}
                    disabled={!message.trim() || isTranscribing}
                >
                    <Send className="h-4 w-4" />
                </Button>

                {isRecording && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            Recording...
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
