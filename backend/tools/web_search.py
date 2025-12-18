"""
Web Search Tool using Perplexity Sonar API

Provides web search capabilities with citations for legal research.
"""

import os
import logging
from typing import Optional, List

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
    Returns results with citations including title, URL, snippet, and date.
    
    Args:
        query: The search query (e.g., 'California arbitration unconscionability cases')
        domain_filter: Optional comma-separated list of domains to filter (e.g., 'law.cornell.edu,justia.com')
                      Use 'legal' to automatically filter to legal sources.
    
    Returns:
        Formatted search results with citations.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    
    if not api_key:
        logger.warning("PERPLEXITY_API_KEY not set - using mock search results")
        return _mock_search(query)
    
    try:
        from perplexity import Perplexity
        
        client = Perplexity(api_key=api_key)
        
        # Build domain filter
        domains = None
        if domain_filter:
            if domain_filter.lower() == 'legal':
                domains = LEGAL_DOMAINS
            else:
                domains = [d.strip() for d in domain_filter.split(',')]
        
        # Execute search
        logger.info(f"Searching: '{query}' (domains: {domains or 'all'})")
        
        if domains:
            search = client.search.create(
                query=query,
                search_domain_filter=domains,
                max_results=5,
                max_tokens_per_page=1024
            )
        else:
            search = client.search.create(
                query=query,
                max_results=5,
                max_tokens_per_page=1024
            )
        
        # Format results
        if not search.results:
            return f"No results found for: {query}"
        
        formatted = f"**Search Results for:** {query}\n\n"
        
        for i, result in enumerate(search.results, 1):
            formatted += f"### {i}. {result.title}\n"
            formatted += f"**Source:** [{result.url}]({result.url})\n"
            if hasattr(result, 'date') and result.date:
                formatted += f"**Date:** {result.date}\n"
            formatted += f"\n{result.snippet[:500]}{'...' if len(result.snippet) > 500 else ''}\n\n"
            formatted += "---\n\n"
        
        logger.info(f"Found {len(search.results)} results")
        return formatted
        
    except ImportError:
        logger.error("Perplexity package not installed. Run: pip install perplexity")
        return _mock_search(query)
    except Exception as e:
        logger.error(f"Search error: {e}")
        return f"Search failed: {str(e)}. Try a different query."


def _mock_search(query: str) -> str:
    """Fallback mock search for when API is unavailable."""
    query_lower = query.lower()
    
    if "unconscionab" in query_lower or "arbitration" in query_lower:
        return """**Search Results for:** unconscionability arbitration

### 1. Armendariz v. Foundation Health Psychcare Services, Inc. (2000)
**Source:** [law.cornell.edu](https://law.cornell.edu/armendariz)
**Date:** 2000

California Supreme Court established that arbitration agreements must meet minimum requirements to be enforceable. Key holdings include: (1) arbitration must allow for adequate discovery, (2) written arbitration decisions required, (3) all remedies that would be available in court must be available.

---

### 2. AT&T Mobility LLC v. Concepcion (2011)
**Source:** [supremecourt.gov](https://supremecourt.gov/concepcion)
**Date:** 2011

US Supreme Court ruling that the Federal Arbitration Act preempts state laws that prohibit contracts from disallowing class-action arbitrations. Major impact on consumer arbitration clauses.

---

### 3. Procedural vs Substantive Unconscionability
**Source:** [justia.com](https://justia.com/unconscionability)

Courts analyze unconscionability using a sliding scale: procedural unconscionability involves 'oppression' or 'surprise' (unequal bargaining power, hidden terms); substantive unconscionability involves 'overly harsh' or 'one-sided' terms.

---
"""
    
    elif "constitution" in query_lower:
        return """**Search Results for:** constitution

### 1. U.S. Constitution - Full Text
**Source:** [law.cornell.edu](https://law.cornell.edu/constitution)

The Constitution of the United States established the framework of the federal government, dividing it into three branches and protecting individual rights through the Bill of Rights and subsequent amendments.

---
"""
    
    return f"""**Search Results for:** {query}

### 1. General Legal Information
**Source:** [findlaw.com](https://findlaw.com)

Search returned general results. For more specific legal research, try including case names, statute numbers, or specific legal concepts in your query.

---
"""
