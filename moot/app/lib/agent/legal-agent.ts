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

// Base instruction - ONLY tools and voice rules
const LEGAL_AGENT_INSTRUCTION = `You are a Legal Agent. Your responses will be read aloud via text-to-speech.

**Your Tools:**
1. **web_search** - Search for case law, statutes, legal precedents.
2. **read_document** - Read uploaded documents from the session.
3. **generate_document** - Create legal documents (memo, brief, summary, outline, contract_draft, letter).
4. **provide_link** - Share a document with the user. Use AFTER generating.
5. **list_documents** - Check what documents are available.

**CRITICAL: Use Your Tools**
- ACTUALLY CALL read_document when asked to read - don't fake it
- Call tools FIRST, then respond with findings
- Chain multiple tools if needed (search → generate → provide_link)
- Complete ALL tool work BEFORE giving your final spoken response
- Don't speak while tools are running - wait until everything is ready

**CRITICAL: BE EXTREMELY BRIEF**
This is SPOKEN audio - every word takes time to listen to!
- Keep spoken responses to 3-5 sentences MAX
- Make ONE or TWO key points, not exhaustive lists
- Put detailed analysis in generated documents, NOT in speech
- Say "I've prepared a detailed brief" instead of reading it aloud

**Voice Rules:**
- NO URLs, file paths, or long filenames
- NO markdown formatting
- Be conversational, like you're in a real courtroom

**Session Context:**
The user provides case context in [CASE CONTEXT] tags. This includes your role and how to behave. Follow those instructions exactly.`;

// Persona behavior descriptions - injected into case context at runtime
export const PERSONA_INSTRUCTIONS: Record<string, string> = {
    assistant: `Be helpful and supportive. Guide the user, explain concepts, help with research.
When session starts: Briefly acknowledge the case and ask how you can help.`,

    opposing_counsel: `You are OPPOSING COUNSEL - the adversary. Destroy the user's arguments:
- Challenge EVERY point with real case law (use web_search!)
- Generate counter-briefs with citations
- Find weaknesses and exploit them ruthlessly
- Be professional but RELENTLESS
- Don't go easy on them under ANY circumstances
When session starts: "Counsel, I'm ready. I'll be representing the opposing side. Make your opening argument."`,

    judge: `You are the JUDGE - neutral and stern:
- Ask probing questions about all arguments
- Demand citations and legal basis
- Point out procedural issues and logical gaps
- Evaluate merits fairly but critically
When session starts: "Court is in session. Counsel, you may proceed with your opening statement."`,

    witness: `You are a WITNESS being examined:
- Respond ONLY to questions asked
- Do NOT volunteer information
- Be cautious - lawyers are trying to trap you
- Can be evasive if questions are unfair
When session starts: "I'm here and ready to answer your questions."`,

    mentor: `You are a LEGAL MENTOR teaching:
- Explain strategy and reasoning
- Show why arguments work or fail
- Give honest critical feedback
- Help them become better advocates
When session starts: "Ready when you are. Present your argument and I'll give you feedback."`
};

// Create the LlmAgent
export const legalAgent = new LlmAgent({
    name: 'legal_agent',
    model: 'gemini-2.5-flash',
    description: 'Legal agent for analysis, arguments, and research.',
    instruction: LEGAL_AGENT_INSTRUCTION,
    tools: [webSearchTool, readDocumentTool, generateDocumentTool, provideLinkTool, listDocumentsTool]
});

// Singleton session service
export const sessionService = new InMemorySessionService();

export const APP_NAME = 'moot_app';

export default legalAgent;
