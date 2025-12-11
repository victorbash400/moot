import { useRef, useEffect } from "react";
import ChatBubble from "./ChatBubble";

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: any[];
    citations?: string[];
}

interface ChatSectionProps {
    messages: Message[];
    interimTranscript: string;
}

export const ChatSection: React.FC<ChatSectionProps> = ({ messages, interimTranscript }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Scroll to bottom whenever messages change (new message or content update during streaming)
        scrollToBottom();
    }, [messages]);

    return (
        <div className="relative border border-[#d4c5b0]/40 rounded-2xl bg-[#fdfbf7]/50 backdrop-blur-sm w-full h-full flex flex-col overflow-hidden shadow-sm">
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 p-8">
                {messages.map((msg) => (
                    <ChatBubble
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        attachments={msg.attachments}
                        citations={msg.citations}
                    />
                ))}
                {/* Show interim transcript as a pending user message or overlay */}
                {interimTranscript && (
                    <div className="flex justify-end mb-8 opacity-60 animate-pulse">
                        <div className="max-w-md">
                            <div className="text-white rounded-3xl px-5 py-3 shadow-sm bg-[#6F4E37]">
                                <p className="text-sm leading-relaxed">{interimTranscript}...</p>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};
