"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TranscriptionMethod = 'local' | 'api'
type ModelType = 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe'

export type { TranscriptionMethod, ModelType }

interface NavbarProps {
    transcriptionMethod?: TranscriptionMethod
    onTranscriptionMethodChange?: (method: TranscriptionMethod) => void
    selectedModel?: ModelType
    onModelChange?: (model: ModelType) => void
}

export function Navbar({
    transcriptionMethod = 'local',
    onTranscriptionMethodChange,
    selectedModel = 'whisper-1',
    onModelChange
}: NavbarProps) {
    return (
        <div className="flex-shrink-0 border-b bg-card px-4 py-3 flex items-center justify-between">

            <h1 className="text-md font-semibold text-foreground">
                Speech-to-Text Chatbot
            </h1>

            <div className="flex items-center gap-4">

                {transcriptionMethod === 'local' && (
                    <Tabs
                        value="tiny"
                        className="w-auto"
                    >
                        <TabsList className="grid w-full grid-cols-1">
                            <TabsTrigger value="tiny" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs px-2">
                                Tiny
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                {transcriptionMethod === 'api' && (
                    <Tabs
                        value={selectedModel}
                        onValueChange={(value) => onModelChange?.(value as ModelType)}
                        className="w-auto"
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="whisper-1" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs px-2">
                                Whisper
                            </TabsTrigger>
                            <TabsTrigger value="gpt-4o-transcribe" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs px-2">
                                GPT-4o
                            </TabsTrigger>
                            <TabsTrigger value="gpt-4o-mini-transcribe" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs px-2">
                                GPT-4o mini
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                <Tabs
                    value={transcriptionMethod}
                    onValueChange={(value) => onTranscriptionMethodChange?.(value as TranscriptionMethod)}
                    className="w-auto"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                            Local
                        </TabsTrigger>
                        <TabsTrigger value="api" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                            API
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    )
}
