import React from 'react';
import ReactMarkdown from 'react-markdown';
import Citations from './Citations';
import { FileText, Download, Search, PenTool, Loader2 } from 'lucide-react';

interface Attachment {
    id: string;
    name: string;
    type: string;
}

interface ChatBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    attachments?: Attachment[];
    citations?: string[];
    toolCall?: string; // e.g., "google_search", "generate_document"
}

// Extract download links from content
const extractDownloadLinks = (content: string): { cleanContent: string; downloads: string[] } => {
    const regex = /\[DOWNLOAD_LINK:([^\]]+)\]/g;
    const downloads: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
        downloads.push(match[1]);
    }

    const cleanContent = content.replace(regex, '');
    return { cleanContent, downloads };
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, attachments, citations, toolCall }) => {
    if (role === 'user') {
        return (
            <div className="flex justify-end mb-8">
                <div className="max-w-md">
                    <div className="text-white rounded-3xl px-5 py-3 shadow-sm bg-[#6F4E37]">
                        <p className="text-sm leading-relaxed">{content}</p>

                        {/* Attachments */}
                        {attachments && attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {attachments.map((attachment) => (
                                    <div key={attachment.id} className="flex items-center gap-2 bg-black bg-opacity-30 rounded-lg px-3 py-2 border border-white border-opacity-20">
                                        <div className="flex-shrink-0">
                                            <svg className="w-4 h-4 text-[#D7CCC8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-[#EFEBE9] font-medium truncate">{attachment.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Extract any download links from the content
    const { cleanContent, downloads } = extractDownloadLinks(content);

    return (
        <div className="mb-4">
            {/* Tool indicator - minimal with icon */}
            {toolCall && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-400">
                    {toolCall.includes('search') ? (
                        <Search className="w-3 h-3 animate-pulse" />
                    ) : toolCall.includes('document') || toolCall.includes('generate') ? (
                        <PenTool className="w-3 h-3 animate-pulse" />
                    ) : toolCall.includes('read') ? (
                        <FileText className="w-3 h-3 animate-pulse" />
                    ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    <span className="font-medium">{toolCall.replace(/_/g, ' ')}</span>
                </div>
            )}

            <div className="w-full text-gray-900">
                <div className="text-base font-normal text-left prose prose-gray max-w-none prose-a:text-[#8B4513] prose-a:underline hover:prose-a:text-[#5D4037]" style={{ lineHeight: '1.7' }}>
                    <ReactMarkdown
                        components={{
                            a: ({ href, children }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#8B4513] underline hover:text-[#5D4037] transition-colors"
                                >
                                    {children}
                                </a>
                            ),
                            strong: ({ children }) => (
                                <strong className="font-semibold text-gray-800">{children}</strong>
                            )
                        }}
                    >
                        {cleanContent}
                    </ReactMarkdown>

                    {/* Document download links - minimal and elegant */}
                    {downloads.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {downloads.map((filename, idx) => (
                                <a
                                    key={idx}
                                    href={`/api/documents?filename=${filename}`}
                                    download
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all group"
                                >
                                    <FileText className="w-4 h-4 text-slate-500 group-hover:text-[#8B4513]" />
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#8B4513]">
                                        {filename.replace(/_/g, ' ').replace(/\d{8}_\d{6}/, '').replace('.pdf', '')}
                                    </span>
                                    <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#8B4513] ml-1" />
                                </a>
                            ))}
                        </div>
                    )}

                    <Citations citations={citations || []} />
                </div>
            </div>
        </div>
    );
};

export default ChatBubble;
