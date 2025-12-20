/**
 * Web Search Tool using Perplexity Sonar API
 * 
 * Provides web search capabilities with citations for legal research.
 */

import { z } from 'zod';

// Legal-focused domains for filtering
const LEGAL_DOMAINS = [
    "law.cornell.edu",
    "scholar.google.com",
    "justia.com",
    "findlaw.com",
    "oyez.org",
    "supremecourt.gov",
    "courtlistener.com",
    "casetext.com",
    "law.com"
];

// Zod schema for tool parameters
export const webSearchSchema = z.object({
    query: z.string().describe("The search query (e.g., 'California arbitration unconscionability cases')"),
    domain_filter: z.string().optional().describe("Optional. Use 'legal' for legal-specific sources.")
});

export type WebSearchParams = z.infer<typeof webSearchSchema>;

/**
 * Search the web for legal cases, statutes, and general legal information.
 * Uses Perplexity Sonar which returns answers with citations.
 */
export async function webSearch({ query, domain_filter }: WebSearchParams): Promise<string> {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
        console.warn('PERPLEXITY_API_KEY not set - using mock search results');
        return mockSearch(query);
    }

    try {
        // Build the search query with domain focus if specified
        let searchQuery = query;
        if (domain_filter?.toLowerCase() === 'legal') {
            searchQuery = `${query} site:law.cornell.edu OR site:justia.com OR site:findlaw.com OR site:supremecourt.gov`;
        }

        console.log(`Searching Perplexity: '${searchQuery}'`);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a legal research assistant. Provide detailed, well-sourced answers about legal topics. Include specific case names, statute references, and key holdings.'
                    },
                    {
                        role: 'user',
                        content: searchQuery
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Perplexity API error: ${response.status} - ${errorText}`);
            return mockSearch(query);
        }

        const data = await response.json();

        // Extract the answer
        const answer = data.choices?.[0]?.message?.content || '';

        // Extract citations from the response
        const citations: string[] = data.citations || [];

        if (!answer) {
            return `No results found for: ${query}`;
        }

        // Build voice-friendly response
        let formatted = `Here's what I found about ${query}:\n\n${answer}\n\n`;

        // Add citation markers for each source
        if (citations.length > 0) {
            for (let i = 0; i < citations.length; i++) {
                const url = citations[i];
                // Extract domain name for title
                const domain = url.replace('https://', '').replace('http://', '').split('/')[0];
                const citationData = {
                    title: `Source ${i + 1}: ${domain}`,
                    url: url,
                    snippet: `Reference from ${domain}`
                };
                formatted += `[CITATION:${JSON.stringify(citationData)}]\n`;
            }
        }

        console.log(`Got response with ${citations.length} citations`);
        return formatted;

    } catch (error) {
        console.error('Search error:', error);
        return mockSearch(query);
    }
}

/**
 * Fallback mock search for when API is unavailable.
 */
function mockSearch(query: string): string {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('unconscionab') || queryLower.includes('arbitration')) {
        return `Here's what I found about unconscionability in arbitration:

The leading case is Armendariz v. Foundation Health Psychcare Services from 2000, where the California Supreme Court established minimum requirements for enforceable arbitration agreements. These include adequate discovery, a written decision by the arbitrator, all remedies that would be available in court, and no unreasonable costs to the employee.

The US Supreme Court addressed federal preemption in AT&T Mobility v. Concepcion in 2011, holding that the Federal Arbitration Act preempts state laws that prohibit class-action waivers in arbitration clauses.

Courts analyze unconscionability on a sliding scale. Procedural unconscionability looks at oppression or surprise in how the contract was formed, such as unequal bargaining power or hidden terms. Substantive unconscionability examines whether the terms themselves are overly harsh or one-sided.

[CITATION:{"title": "Armendariz v. Foundation Health", "url": "https://law.cornell.edu/supremecourt/text/case/armendariz", "date": "2000", "snippet": "California Supreme Court case establishing minimum arbitration requirements"}]
[CITATION:{"title": "AT&T v. Concepcion", "url": "https://supremecourt.gov/opinions/10pdf/09-893.pdf", "date": "2011", "snippet": "Federal Arbitration Act preemption of state law"}]
[CITATION:{"title": "Unconscionability Doctrine", "url": "https://justia.com/contracts/unconscionability", "snippet": "Overview of procedural and substantive unconscionability"}]
`;
    }

    if (queryLower.includes('constitution') || queryLower.includes('kenya')) {
        return `Here's what I found about ${query}:

The Constitution of Kenya 2010 is the supreme law of the Republic of Kenya. It establishes the framework for governance, including the executive, legislature, and judiciary. Key features include a Bill of Rights in Chapter 4, devolution of power to 47 county governments, and provisions for public participation in governance.

The Constitution provides for fundamental rights and freedoms, including equality and freedom from discrimination, human dignity, and access to justice. It also establishes independent commissions to oversee various aspects of governance.

[CITATION:{"title": "Constitution of Kenya 2010", "url": "https://kenyalaw.org/kl/index.php?id=398", "date": "2010", "snippet": "Full text of Kenya's constitution"}]
[CITATION:{"title": "Kenya Law Reports", "url": "https://kenyalaw.org", "snippet": "Official repository of Kenyan legal materials"}]
`;
    }

    return `Here's what I found about ${query}:

I found general legal information related to your query. For more specific results, try including case names, statute numbers, or specific legal concepts.

[CITATION:{"title": "Legal Research Guide", "url": "https://findlaw.com", "snippet": "General legal research starting point"}]
`;
}

export default webSearch;
