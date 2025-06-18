"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
    onSendMessage: (message: string) => void
    onAudioTranscribe: (audioBlob: Blob) => Promise<string>
    isRecording: boolean
    isTranscribing?: boolean
    disabled?: boolean
}

export function ChatInput({
    onSendMessage,
    onAudioTranscribe,
    isRecording,
    isTranscribing,
    disabled = false,
}: ChatInputProps) {
    const [message, setMessage] = useState("")
    const [isRecordingState, setIsRecordingState] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const handleSendMessage = useCallback(() => {
        if (message.trim() && !disabled) {
            onSendMessage(message.trim())
            setMessage("")
        }
    }, [message, onSendMessage, disabled])

    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
            }
        },
        [handleSendMessage]
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
                    const transcribedText = await onAudioTranscribe(audioBlob)
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
    }, [onAudioTranscribe])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecordingState) {
            mediaRecorderRef.current.stop()
            setIsRecordingState(false)
        }
    }, [isRecordingState])

    const handleMicClick = useCallback(() => {
        if (disabled || isTranscribing) return

        if (isRecordingState) {
            stopRecording()
        } else {
            startRecording()
        }
    }, [isRecordingState, startRecording, stopRecording, disabled, isTranscribing])

    return (
        <div className="relative flex items-center gap-2 p-4 border-t bg-background">
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
                    disabled={disabled || isRecording || isTranscribing}
                    className="flex-1"
                />                <Button
                    size="icon"
                    variant="outline"
                    onClick={handleMicClick}
                    disabled={disabled || isTranscribing}
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
                    onClick={handleSendMessage}
                    disabled={!message.trim() || disabled || isRecording || isTranscribing}
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
    )
}
