import { cn } from "@/lib/utils"

interface ChatBubbleProps {
    message: string
    isUser: boolean
}

export function ChatBubble({ message, isUser }: ChatBubbleProps) {
    return (
        <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[80%] rounded-full px-4 py-2 text-sm",
                    isUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                )}
            >
                <p className="whitespace-pre-wrap">{message}</p>
            </div>
        </div>
    )
}
