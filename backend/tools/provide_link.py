"""
Link Provider Tool

Allows the AI to add links/documents to the citations panel.
The AI should use this when it wants to share a link with the user.
"""

import logging

logger = logging.getLogger(__name__)


def provide_link(title: str, url: str, description: str = "") -> str:
    """
    Add a link to the citations panel for the user to access.
    Use this when you want to share a URL, document, or reference with the user.
    The link will appear in the Sources panel on the right side of the chat.
    
    Args:
        title: A descriptive title for the link (e.g., "Contract Summary PDF", "Cornell Law Article")
        url: The URL or file path to share
        description: Optional brief description of what the link contains
    
    Returns:
        Confirmation message. The link will be in the citations panel.
    """
    logger.info(f"Link provided: {title} -> {url}")
    
    # Return a marker that the backend will convert to a citation event
    return f"[LINK_PROVIDED:{title}|{url}|{description}]"
