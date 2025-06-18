"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TranscriptionMethod = 'local' | 'api'

interface NavbarProps {
    transcriptionMethod?: TranscriptionMethod
    onTranscriptionMethodChange?: (method: TranscriptionMethod) => void
}

export function Navbar({
    transcriptionMethod = 'local',
    onTranscriptionMethodChange
}: NavbarProps) {
    return (
        <div className="flex-shrink-0 border-b bg-card px-4 py-3 flex items-center justify-between">

            <h1 className="text-md font-semibold text-foreground">
                Speech-to-Text Chatbot
            </h1>
            
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
    )
}
