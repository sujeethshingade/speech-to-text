import { cn } from "@/lib/utils"

interface ChatBubbleProps {
    message: string
    isUser: boolean
    timestamp?: string
}

export function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
    return (
        <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                    isUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                )}
            >
                <p className="whitespace-pre-wrap">{message}</p>
                {timestamp && (
                    <p className="mt-1 text-xs opacity-70">
                        {new Date(timestamp).toLocaleTimeString()}
                    </p>
                )}
            </div>
        </div>
    )
}
