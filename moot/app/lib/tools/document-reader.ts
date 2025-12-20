/**
 * Document Reader Tool
 * 
 * Reads and extracts content from uploaded documents (PDFs, text files, etc.)
 * Documents are scoped by session ID for isolation between chat sessions.
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

// File path for persistence
const DB_PATH = path.join(process.cwd(), '.documents.json');

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

// Helper to load store
function loadStore(): DocumentStore {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load document store:', e);
    }
    return {};
}

// Helper to save store
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
    const store = loadStore();
    if (!store[sessionId]) {
        store[sessionId] = {};
    }
    store[sessionId][id] = { name, content, type };
    saveStore(store);
    console.log(`Document added to session ${sessionId}: ${name}`);
}

/**
 * Get all document names for a session
 */
export async function getDocumentNames(sessionId?: string): Promise<string[]> {
    const sid = sessionId || currentSessionId;
    if (!sid) return [];

    const store = loadStore();
    const sessionDocs = store[sid] || {};
    return Object.values(sessionDocs).map(d => d.name);
}

/**
 * Clear all documents for a session
 */
export function clearSessionDocuments(sessionId: string) {
    const store = loadStore();
    if (store[sessionId]) {
        delete store[sessionId];
        saveStore(store);
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

        const store = loadStore();
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
        let content = doc.content;

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

    const store = loadStore();
    const sessionDocs = store[currentSessionId] || {};
    const docs = Object.values(sessionDocs);

    if (docs.length === 0) {
        return "No documents found in this session.";
    }

    const docList = docs.map(d => `- ${d.name} (${d.type}, ${d.content.length} chars)`).join('\n');
    return `Available documents:\n${docList}\n\nUse read_document(name) to read specific content.`;
}
