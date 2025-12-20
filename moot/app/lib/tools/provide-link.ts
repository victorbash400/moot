/**
 * Link Provider Tool
 * 
 * Allows the AI to add links/documents to the citations panel.
 */

import { z } from 'zod';

// Zod schema for tool parameters
export const provideLinkSchema = z.object({
    title: z.string().describe("A descriptive title for the link (e.g., 'Contract Summary PDF', 'Cornell Law Article')"),
    url: z.string().describe("The URL or file path to share"),
    description: z.string().optional().describe("Optional brief description of what the link contains")
});

export type ProvideLinkParams = z.infer<typeof provideLinkSchema>;

/**
 * Add a link to the citations panel for the user to access.
 * Use this when you want to share a URL, document, or reference with the user.
 * The link will appear in the Sources panel on the right side of the chat.
 */
export async function provideLink({ title, url, description = '' }: ProvideLinkParams): Promise<string> {
    console.log(`Link provided: ${title} -> ${url}`);

    // Return a marker that the stream handler will convert to a citation event
    return `[LINK_PROVIDED:${title}|${url}|${description}]`;
}

export default provideLink;
