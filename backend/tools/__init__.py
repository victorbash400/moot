"""
Legal Agent Tools Package
"""

from tools.web_search import web_search
from tools.document_reader import read_document
from tools.document_generator import generate_document

__all__ = [
    'web_search',
    'read_document', 
    'generate_document',
]
