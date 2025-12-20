/**
 * Legal Agent with proper Google ADK
 * 
 * Uses LlmAgent with FunctionTool wrappers and proper session management.
 */

import { LlmAgent, FunctionTool, InMemorySessionService } from '@google/adk';
import { z } from 'zod';
import { webSearch } from '../tools/web-search';
import { readDocument, listDocuments } from '../tools/document-reader';
import { generateDocument } from '../tools/document-generator';
import { provideLink } from '../tools/provide-link';

// 1. Web Search Tool
const WebSearchSchema = z.object({
    query: z.string().describe("The search query (e.g., 'California arbitration unconscionability cases')"),
    domain_filter: z.string().optional().describe("Optional. Use 'legal' for legal-specific sources.")
});

// Use strict types for execution params to satisfy TS inference
type WebSearchParams = z.infer<typeof WebSearchSchema>;

// Use <any> generic to bypass Zod version mismatch (Project uses v4, ADK uses v3)
// We still type check the parameters in the execute function manually
const webSearchTool = new FunctionTool<any>({
    name: 'web_search',
    description: 'Search the web for legal cases, statutes, and general legal information using Perplexity Sonar.',
    parameters: WebSearchSchema,
    execute: async (params: WebSearchParams) => {
        // webSearch expects { query, domain_filter } which matches WebSearchParams
        const result = await webSearch(params);
        return { result };
    }
});

// 2. Read Document Tool
const ReadDocSchema = z.object({
    document_name: z.string().describe("Name or ID of the document to read"),
    section: z.string().optional().describe("Optional specific section to extract")
});

type ReadDocParams = z.infer<typeof ReadDocSchema>;

const readDocumentTool = new FunctionTool<any>({
    name: 'read_document',
    description: 'Read content from an uploaded document in the session context.',
    parameters: ReadDocSchema,
    execute: async (params: ReadDocParams) => {
        const result = await readDocument(params);
        return { result };
    }
});

// 2.5 List Documents Tool
const ListDocsSchema = z.object({});

const listDocumentsTool = new FunctionTool<any>({
    name: 'list_documents',
    description: 'List all available documents in the current session. Use this to see what files you can read.',
    parameters: ListDocsSchema,
    execute: async () => {
        const result = await listDocuments();
        return { result };
    }
});

// 3. Generate Document Tool
const GenerateDocSchema = z.object({
    document_type: z.enum(['memo', 'brief', 'summary', 'outline', 'contract_draft', 'letter'])
        .describe("Type of document to generate"),
    title: z.string().describe("Title of the document"),
    content: z.string().describe("The main content/body of the document"),
    metadata: z.string().optional().describe("Optional JSON string with additional info")
});

type GenerateDocParams = z.infer<typeof GenerateDocSchema>;

const generateDocumentTool = new FunctionTool<any>({
    name: 'generate_document',
    description: 'Generate a formatted legal document as Markdown. Supports memo, brief, summary, outline, contract_draft, and letter types.',
    parameters: GenerateDocSchema,
    execute: async (params: GenerateDocParams) => {
        const result = await generateDocument(params);
        return { result };
    }
});

// 4. Provide Link Tool
const ProvideLinkSchema = z.object({
    title: z.string().describe("A descriptive title for the link"),
    url: z.string().describe("The URL or file path to share"),
    description: z.string().optional().describe("Optional brief description")
});

type ProvideLinkParams = z.infer<typeof ProvideLinkSchema>;

const provideLinkTool = new FunctionTool<any>({
    name: 'provide_link',
    description: 'Add a link to the citations panel for the user to access. The link appears in the Sources panel.',
    parameters: ProvideLinkSchema,
    execute: async (params: ProvideLinkParams) => {
        const result = await provideLink(params);
        return { result };
    }
});

// System instruction for the legal agent
const LEGAL_AGENT_INSTRUCTION = `You are a Legal Agent having a spoken conversation about law. Your responses will be read aloud via text-to-speech.

**Your Tools:**
1. **web_search** - Search for case law, statutes, legal precedents. Use domain_filter='legal' for legal sources.
2. **read_document** - Read uploaded documents from the session.
3. **generate_document** - Create legal documents (memo, brief, summary, outline, contract_draft, letter).
4. **provide_link** - Share a link or document with the user. Use this AFTER generating a document.
5. **list_documents** - Check what documents are currently available to read.

**IMPORTANT: Sharing Links**
- NEVER include URLs or file paths in your spoken response (they can't be clicked when spoken)
- When you generate a document, ALWAYS call provide_link with the filename to share it
- Say something like "I've added the download link to your Sources panel on the right"

**Response Style for Voice:**
Since your response will be SPOKEN ALOUD:
- Cite sources CONVERSATIONALLY: "According to the Armendariz case..." 
- DO NOT include URLs, links, or file paths in your spoken response
- DO NOT read out full filenames - just say "your document" or "the uploaded document"
- Avoid reading long technical names, timestamps, or IDs - simplify for speech
- NO markdown formatting (no asterisks, no bullet points, no headers)
- Write in natural flowing sentences and paragraphs
- Be conversational and brief, like talking to a colleague
- Keep responses brief and to the point - remember it will be audio, you don't want to ramble

**Session Context:**
The user provides case context at session start in [CASE CONTEXT] tags. Reference this when relevant.
`;

// Create the LlmAgent with Gemini 3 Flash for better reasoning
export const legalAgent = new LlmAgent({
    name: 'legal_agent',
    model: 'gemini-2.5-flash',  // Match Python backend model
    description: 'Specialist legal agent for contract analysis, drafting arguments, and legal research.',
    instruction: LEGAL_AGENT_INSTRUCTION,
    tools: [webSearchTool, readDocumentTool, generateDocumentTool, provideLinkTool, listDocumentsTool]
});

// Singleton session service (persists across requests in development)
export const sessionService = new InMemorySessionService();

export const APP_NAME = 'moot_app';

export default legalAgent;
