"use client"

import { Navbar } from "@/components/Navbar"
import { Chatbot } from "@/components/Chatbot"

export default function Home() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <Chatbot />
      </div>
    </div>
  )
}