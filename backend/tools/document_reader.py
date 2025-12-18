"""
Document Reader Tool

Reads and extracts content from uploaded documents (PDFs, text files, etc.)
that are part of the session context.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Store for uploaded documents (in production, use a proper storage service)
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


def read_document(document_name: str, section: Optional[str] = None) -> str:
    """
    Read content from an uploaded document in the session context.
    
    Args:
        document_name: Name or ID of the document to read (e.g., "contract.pdf", "deposition_smith.txt")
        section: Optional specific section to extract (e.g., "Article 5", "Page 3", "Arbitration Clause")
    
    Returns:
        The content of the document or specified section.
    """
    try:
        # Find the document in uploads
        if not os.path.exists(UPLOADS_DIR):
            return f"No documents have been uploaded to this session."
        
        # Look for matching files
        matching_files = []
        for filename in os.listdir(UPLOADS_DIR):
            if document_name.lower() in filename.lower():
                matching_files.append(filename)
        
        if not matching_files:
            available = os.listdir(UPLOADS_DIR) if os.path.exists(UPLOADS_DIR) else []
            if available:
                return f"Document '{document_name}' not found. Available documents: {', '.join(available)}"
            return f"No documents found. Please upload documents to the session first."
        
        # Read the first matching file
        file_path = os.path.join(UPLOADS_DIR, matching_files[0])
        
        if file_path.endswith('.pdf'):
            # Use PyPDF2 for PDF files
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                content = ""
                for page in reader.pages:
                    content += page.extract_text() + "\n"
            except ImportError:
                return "PDF reading requires PyPDF2. Please install it."
            except Exception as e:
                return f"Error reading PDF: {str(e)}"
        else:
            # Read as text
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        
        # If section specified, try to find it
        if section:
            section_lower = section.lower()
            lines = content.split('\n')
            
            # Try to find section by header
            section_content = []
            in_section = False
            for line in lines:
                if section_lower in line.lower():
                    in_section = True
                elif in_section and line.strip() and line[0].isupper():
                    # Likely hit a new section header
                    break
                if in_section:
                    section_content.append(line)
            
            if section_content:
                return f"**Section: {section}**\n\n" + '\n'.join(section_content)
            else:
                return f"Section '{section}' not found in document. Here's the full content:\n\n{content[:2000]}..."
        
        # Return full content (truncated if too long)
        if len(content) > 5000:
            return f"**Document: {matching_files[0]}**\n\n{content[:5000]}\n\n... [Document truncated. Ask for specific sections.]"
        
        return f"**Document: {matching_files[0]}**\n\n{content}"
        
    except Exception as e:
        logger.error(f"Error reading document: {e}")
        return f"Error reading document: {str(e)}"
