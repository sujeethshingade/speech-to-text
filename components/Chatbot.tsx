"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
    const [isRecordingState, setIsRecordingState] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSendMessage = useCallback((text: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            isUser: true,
        }

        setMessages((prev) => [...prev, newMessage])

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "I received your message: \"" + text + "\". This is a demo response. In a real application, this would be processed by an AI model.",
                isUser: false,
            }
            setMessages((prev) => [...prev, aiResponse])
        }, 1000)
    }, [])

    const handleAudioTranscribe = async (audioBlob: Blob) => {
        try {
            setIsTranscribing(true)
            const formData = new FormData()
            formData.append("audio", audioBlob, "recording.webm")

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to transcribe audio`)
            }

            const data = await response.json()

            // Handle the new API response format
            if (data.success === false) {
                throw new Error(data.error || "Transcription failed")
            }

            // Return the transcribed text instead of sending it automatically
            return data.text && data.text.trim() ? data.text : ""
        } catch (error) {
            console.error("Transcription error:", error)
            return ""
        } finally {
            setIsTranscribing(false)
        }
    }

    const handleSendTextMessage = useCallback(() => {
        if (message.trim() && !isTranscribing) {
            handleSendMessage(message.trim())
            setMessage("")
        }
    }, [message, handleSendMessage, isTranscribing])

    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendTextMessage()
            }
        },
        [handleSendTextMessage]
    )

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)

            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })

                try {
                    const transcribedText = await handleAudioTranscribe(audioBlob)
                    if (transcribedText && transcribedText.trim()) {
                        setMessage(transcribedText)
                    }
                } catch (error) {
                    console.error("Error during transcription:", error)
                }

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecordingState(true)
        } catch (error) {
            console.error("Error starting recording:", error)
            alert("Could not access microphone. Please check permissions.")
        }
    }, [handleAudioTranscribe])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecordingState) {
            mediaRecorderRef.current.stop()
            setIsRecordingState(false)
        }
    }, [isRecordingState])

    const handleMicClick = useCallback(() => {
        if (isTranscribing) return

        if (isRecordingState) {
            stopRecording()
        } else {
            startRecording()
        }
    }, [isRecordingState, startRecording, stopRecording, isTranscribing])    // Chat Bubble Component
    const ChatBubble = ({ message, isUser }: { message: string; isUser: boolean }) => (
        <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[80%] rounded-full px-4 py-3 text-sm shadow-sm",
                    isUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900 border border-gray-200"
                )}
            >
                <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <ChatBubble
                        key={msg.id}
                        message={msg.text}
                        isUser={msg.isUser}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Fixed */}
            <div className="flex-shrink-0 relative flex items-center gap-2 p-4 border-t bg-background">
                <div className="flex-1 flex items-center gap-2">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={
                            isRecordingState
                                ? "Recording... Click the mic to stop"
                                : isTranscribing
                                    ? "Processing your voice..."
                                    : "Ask anything..."
                        }
                        disabled={isRecording || isTranscribing}
                        className="flex-1"
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleMicClick}
                        disabled={isTranscribing}
                        className={cn(
                            "transition-all duration-200",
                            (isRecordingState || isRecording) && "bg-red-500 text-white hover:bg-red-600 border-red-500 animate-pulse",
                            isTranscribing && "opacity-50",
                            !isRecordingState && !isRecording && "hover:bg-gray-100"
                        )}
                    >
                        {isRecordingState || isRecording ? (
                            <MicOff className="h-4 w-4 text-white" />
                        ) : (
                            <Mic className="h-4 w-4 text-gray-600" />
                        )}
                    </Button>
                    <Button
                        size="icon"
                        onClick={handleSendTextMessage}
                        disabled={!message.trim() || isRecording || isTranscribing}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Recording indicator */}
                {(isRecordingState || isRecording) && (
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