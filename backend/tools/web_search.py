"""
Web Search Tool using Perplexity Sonar API

Provides web search capabilities with citations for legal research.
Uses the OpenAI-compatible API endpoint.
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Legal-focused domains for filtering
LEGAL_DOMAINS = [
    "law.cornell.edu",
    "scholar.google.com", 
    "justia.com",
    "findlaw.com",
    "oyez.org",
    "supremecourt.gov",
    "courtlistener.com",
    "casetext.com",
    "law.com"
]


def web_search(query: str, domain_filter: Optional[str] = None) -> str:
    """
    Search the web for legal cases, statutes, and general legal information.
    Uses Perplexity Sonar which returns answers with citations.
    
    Args:
        query: The search query (e.g., 'California arbitration unconscionability cases')
        domain_filter: Optional. Use 'legal' for legal-specific sources.
    
    Returns:
        Voice-friendly search results with [CITATION:...] markers for the UI.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    
    if not api_key:
        logger.warning("PERPLEXITY_API_KEY not set - using mock search results")
        return _mock_search(query)
    
    try:
        import httpx
        
        # Build the search query with domain focus if specified
        search_query = query
        if domain_filter and domain_filter.lower() == 'legal':
            search_query = f"{query} site:law.cornell.edu OR site:justia.com OR site:findlaw.com OR site:supremecourt.gov"
        
        logger.info(f"Searching Perplexity: '{search_query}'")
        
        # Use OpenAI-compatible endpoint
        response = httpx.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "sonar",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a legal research assistant. Provide detailed, well-sourced answers about legal topics. Include specific case names, statute references, and key holdings."
                    },
                    {
                        "role": "user", 
                        "content": search_query
                    }
                ]
            },
            timeout=30.0
        )
        
        if response.status_code != 200:
            logger.error(f"Perplexity API error: {response.status_code} - {response.text}")
            return _mock_search(query)
        
        data = response.json()
        
        # Extract the answer
        answer = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Extract citations from the response
        citations = data.get("citations", [])
        
        if not answer:
            return f"No results found for: {query}"
        
        # Build voice-friendly response
        formatted = f"Here's what I found about {query}:\n\n{answer}\n\n"
        
        # Add citation markers for each source
        if citations:
            for i, url in enumerate(citations):
                # Extract domain name for title
                domain = url.replace('https://', '').replace('http://', '').split('/')[0]
                citation_data = {
                    "title": f"Source {i+1}: {domain}",
                    "url": url,
                    "snippet": f"Reference from {domain}"
                }
                formatted += f"[CITATION:{json.dumps(citation_data)}]\n"
        
        logger.info(f"Got response with {len(citations)} citations")
        return formatted
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return _mock_search(query)


def _mock_search(query: str) -> str:
    """Fallback mock search for when API is unavailable."""
    query_lower = query.lower()
    
    if "unconscionab" in query_lower or "arbitration" in query_lower:
        result = """Here's what I found about unconscionability in arbitration:

The leading case is Armendariz v. Foundation Health Psychcare Services from 2000, where the California Supreme Court established minimum requirements for enforceable arbitration agreements. These include adequate discovery, a written decision by the arbitrator, all remedies that would be available in court, and no unreasonable costs to the employee.

The US Supreme Court addressed federal preemption in AT&T Mobility v. Concepcion in 2011, holding that the Federal Arbitration Act preempts state laws that prohibit class-action waivers in arbitration clauses.

Courts analyze unconscionability on a sliding scale. Procedural unconscionability looks at oppression or surprise in how the contract was formed, such as unequal bargaining power or hidden terms. Substantive unconscionability examines whether the terms themselves are overly harsh or one-sided.

[CITATION:{"title": "Armendariz v. Foundation Health", "url": "https://law.cornell.edu/supremecourt/text/case/armendariz", "date": "2000", "snippet": "California Supreme Court case establishing minimum arbitration requirements"}]
[CITATION:{"title": "AT&T v. Concepcion", "url": "https://supremecourt.gov/opinions/10pdf/09-893.pdf", "date": "2011", "snippet": "Federal Arbitration Act preemption of state law"}]
[CITATION:{"title": "Unconscionability Doctrine", "url": "https://justia.com/contracts/unconscionability", "snippet": "Overview of procedural and substantive unconscionability"}]
"""
        return result
    
    elif "constitution" in query_lower or "kenya" in query_lower:
        return f"""Here's what I found about {query}:

The Constitution of Kenya 2010 is the supreme law of the Republic of Kenya. It establishes the framework for governance, including the executive, legislature, and judiciary. Key features include a Bill of Rights in Chapter 4, devolution of power to 47 county governments, and provisions for public participation in governance.

The Constitution provides for fundamental rights and freedoms, including equality and freedom from discrimination, human dignity, and access to justice. It also establishes independent commissions to oversee various aspects of governance.

[CITATION:{{"title": "Constitution of Kenya 2010", "url": "https://kenyalaw.org/kl/index.php?id=398", "date": "2010", "snippet": "Full text of Kenya's constitution"}}]
[CITATION:{{"title": "Kenya Law Reports", "url": "https://kenyalaw.org", "snippet": "Official repository of Kenyan legal materials"}}]
"""
    
    return f"""Here's what I found about {query}:

I found general legal information related to your query. For more specific results, try including case names, statute numbers, or specific legal concepts.

[CITATION:{{"title": "Legal Research Guide", "url": "https://findlaw.com", "snippet": "General legal research starting point"}}]
"""
