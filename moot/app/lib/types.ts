// Shared TypeScript types for the Moot application

export interface CaseContextRequest {
    case_type: string;
    difficulty: string;
    description: string;
    uploaded_files?: string[];
}

export interface ChatRequest {
    message: string;
    user_id?: string;
    session_id?: string | null;
    agent_id?: string;
    voice_id?: string | null;
    case_context?: CaseContextRequest | null;
}

export interface StreamEvent {
    type: 'session' | 'content' | 'audio' | 'citation' | 'tool_call' | 'done' | 'error';
    session_id?: string;
    content?: string;
    data?: string; // base64 audio
    citation_type?: 'source' | 'document';
    title?: string;
    url?: string;
    date?: string;
    snippet?: string;
    tool_name?: string;
    error?: string;
}

export interface Citation {
    id: string;
    type: 'source' | 'document';
    title: string;
    url?: string;
    date?: string;
    snippet?: string;
}

export interface ToolResult {
    result: string;
    citations?: Citation[];
}

export interface Voice {
    voice_id: string;
    name: string;
    category: string;
}

// Session storage (in-memory for serverless)
export interface Session {
    id: string;
    userId: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    caseContext?: CaseContextRequest;
    createdAt: Date;
}
