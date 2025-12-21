/**
 * Document Reader Tool
 * 
 * Reads and extracts content from uploaded documents (PDFs, text files, etc.)
 * Documents are scoped by session ID for isolation between chat sessions.
 * 
 * Storage: Uses Vercel KV in production, falls back to file storage locally.
 */

import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Zod schema for tool parameters
export const documentReaderSchema = z.object({
    document_name: z.string().describe("Name or ID of the document to read (e.g., 'contract.pdf', 'deposition_smith.txt')"),
    section: z.string().optional().describe("Optional specific section to extract (e.g., 'Article 5', 'Page 3', 'Arbitration Clause')")
});

export type DocumentReaderParams = z.infer<typeof documentReaderSchema>;

// File path for local persistence
const DB_PATH = path.join(process.cwd(), '.documents.json');

// Debug: Log at module load time
console.log('[document-reader] Module loaded. ENV CHECK:', {
    KV_REST_API_URL: process.env.KV_REST_API_URL ? 'PRESENT' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV
});

// Check if Vercel KV (Upstash Redis) is available - check at runtime, not module load
function isKVAvailable(): boolean {
    const available = !!process.env.KV_REST_API_URL;
    console.log(`KV check: KV_REST_API_URL=${process.env.KV_REST_API_URL ? 'SET' : 'NOT SET'}, using KV: ${available}`);
    return available;
}

interface DocumentItem {
    name: string;
    content: string;
    type: string;
}

// Storage structure: { sessionId: { docId: DocumentItem } }
interface DocumentStore {
    [sessionId: string]: {
        [docId: string]: DocumentItem;
    };
}

// Current session context (set before tool execution)
let currentSessionId: string | null = null;

/**
 * Set the current session context for document operations
 */
export function setSessionContext(sessionId: string) {
    currentSessionId = sessionId;
}

/**
 * Get the current session ID
 */
export function getSessionContext(): string | null {
    return currentSessionId;
}

// ============ STORAGE ABSTRACTION ============

// KV key for the document store
const KV_STORE_KEY = 'moot:documents';

// Check if we're in production (Vercel)
const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Load store from KV (production) or file (local dev)
async function loadStoreAsync(): Promise<DocumentStore> {
    console.log('[loadStore] isKVAvailable:', isKVAvailable(), 'isProduction:', isProduction);

    if (isKVAvailable()) {
        try {
            const { kv } = await import('@vercel/kv');
            const data = await kv.get<DocumentStore>(KV_STORE_KEY);
            console.log('[loadStore] Loaded from KV, sessions:', Object.keys(data || {}).length);
            return data || {};
        } catch (e) {
            console.error('[loadStore] KV load error:', e);
            throw new Error('Failed to load from KV: ' + (e instanceof Error ? e.message : 'Unknown error'));
        }
    } else if (isProduction) {
        // In production without KV - this is a configuration error
        throw new Error('FATAL: Running in production but KV_REST_API_URL is not set. Configure Upstash KV.');
    } else {
        // Local dev - use file storage
        try {
            if (fs.existsSync(DB_PATH)) {
                const data = fs.readFileSync(DB_PATH, 'utf-8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[loadStore] File load error:', e);
        }
        return {};
    }
}

// Save store to KV (production) or file (local dev)
async function saveStoreAsync(store: DocumentStore): Promise<void> {
    console.log('[saveStore] isKVAvailable:', isKVAvailable(), 'isProduction:', isProduction);

    if (isKVAvailable()) {
        try {
            const { kv } = await import('@vercel/kv');
            await kv.set(KV_STORE_KEY, store);
            console.log('[saveStore] Saved to KV');
        } catch (e) {
            console.error('[saveStore] KV save error:', e);
            throw new Error('Failed to save to KV: ' + (e instanceof Error ? e.message : 'Unknown error'));
        }
    } else if (isProduction) {
        // In production without KV - this is a configuration error
        throw new Error('FATAL: Running in production but KV_REST_API_URL is not set. Configure Upstash KV.');
    } else {
        // Local dev - use file storage
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
            console.log('[saveStore] Saved to file');
        } catch (e) {
            console.error('[saveStore] File save error:', e);
        }
    }
}

// Synchronous save for backward compatibility (file only) - kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveStore(store: DocumentStore) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save document store:', e);
    }
}

/**
 * Add a document to the store (called by upload endpoint)
 * @param sessionId - The session this document belongs to
 * @param id - Unique document ID
 * @param name - Original filename
 * @param content - Extracted text content
 * @param type - MIME type
 */
export async function addDocument(sessionId: string, id: string, name: string, content: string, type: string) {
    const store = await loadStoreAsync();
    if (!store[sessionId]) {
        store[sessionId] = {};
    }
    store[sessionId][id] = { name, content, type };
    await saveStoreAsync(store);
    console.log(`Document added to session ${sessionId}: ${name}`);
}

/**
 * Get all document names for a session
 */
export async function getDocumentNames(sessionId?: string): Promise<string[]> {
    const sid = sessionId || currentSessionId;
    if (!sid) return [];

    const store = await loadStoreAsync();
    const sessionDocs = store[sid] || {};
    return Object.values(sessionDocs).map(d => d.name);
}

/**
 * Clear all documents for a session
 */
export async function clearSessionDocuments(sessionId: string) {
    const store = await loadStoreAsync();
    if (store[sessionId]) {
        delete store[sessionId];
        await saveStoreAsync(store);
        console.log(`Cleared documents for session ${sessionId}`);
    }
}

/**
 * Clear all documents (for testing)
 */
export function clearDocuments() {
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
    }
}

/**
 * Read content from an uploaded document in the session context.
 */
export async function readDocument({ document_name, section }: DocumentReaderParams): Promise<string> {
    try {
        if (!currentSessionId) {
            return 'No session context set. Unable to access documents.';
        }

        const store = await loadStoreAsync();
        const sessionDocs = store[currentSessionId] || {};

        if (Object.keys(sessionDocs).length === 0) {
            return 'No documents have been uploaded to this session.';
        }

        // Look for matching documents
        const matchingDocs: Array<{ id: string; name: string; content: string }> = [];

        for (const [id, doc] of Object.entries(sessionDocs)) {
            if (doc.name.toLowerCase().includes(document_name.toLowerCase())) {
                matchingDocs.push({ id, name: doc.name, content: doc.content });
            }
        }

        if (matchingDocs.length === 0) {
            const available = await getDocumentNames(currentSessionId);
            if (available.length > 0) {
                return `Document '${document_name}' not found. Available documents: ${available.join(', ')}`;
            }
            return 'No documents found. Please upload documents to the session first.';
        }

        // Use the first matching document
        const doc = matchingDocs[0];
        const content = doc.content;

        // If section specified, try to find it
        if (section) {
            const sectionLower = section.toLowerCase();
            const lines = content.split('\n');

            // Try to find section by header
            const sectionContent: string[] = [];
            let inSection = false;

            for (const line of lines) {
                if (line.toLowerCase().includes(sectionLower)) {
                    inSection = true;
                } else if (inSection && line.trim() && /^[A-Z]/.test(line.trim())) {
                    // Likely hit a new section header
                    break;
                }
                if (inSection) {
                    sectionContent.push(line);
                }
            }

            if (sectionContent.length > 0) {
                return `**Section: ${section}**\n\n${sectionContent.join('\n')}`;
            } else {
                return `Section '${section}' not found in document. Here's the full content:\n\n${content.slice(0, 2000)}...`;
            }
        }

        // Return full content (truncated if too long)
        if (content.length > 5000) {
            return `**Document: ${doc.name}**\n\n${content.slice(0, 5000)}\n\n... [Document truncated. Ask for specific sections.]`;
        }

        return `**Document: ${doc.name}**\n\n${content}`;

    } catch (error) {
        console.error('Error reading document:', error);
        return `Error reading document: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

export default readDocument;

// Zod schema for list_documents tool
export const listDocumentsSchema = z.object({});

export type ListDocumentsParams = z.infer<typeof listDocumentsSchema>;

/**
 * List all available documents in the session.
 * Used by the agent to discover what files it can read.
 */
export async function listDocuments(): Promise<string> {
    if (!currentSessionId) {
        return 'No session context set. Unable to list documents.';
    }

    const store = await loadStoreAsync();
    const sessionDocs = store[currentSessionId] || {};
    const docs = Object.values(sessionDocs);

    if (docs.length === 0) {
        return "No documents found in this session.";
    }

    const docList = docs.map(d => `- ${d.name} (${d.type}, ${d.content.length} chars)`).join('\n');
    return `Available documents:\n${docList}\n\nUse read_document(name) to read specific content.`;
}
