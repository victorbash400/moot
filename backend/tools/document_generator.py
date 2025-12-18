"""
Document Generator Tool

Generates formatted legal documents like memos, briefs, summaries, and argument outlines.
Outputs both Markdown and PDF versions.
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Output directory for generated documents
GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated")


def generate_document(
    document_type: str,
    title: str,
    content: str,
    metadata: Optional[str] = None
) -> str:
    """
    Generate a formatted legal document and save it as both Markdown and PDF.
    
    Args:
        document_type: Type of document - "memo", "brief", "summary", "outline", "contract_draft", "letter"
        title: Title of the document
        content: The main content/body of the document
        metadata: Optional JSON string with additional info like case_number, client, date, author
    
    Returns:
        Confirmation message with download link.
    """
    try:
        # Ensure output directory exists
        os.makedirs(GENERATED_DIR, exist_ok=True)
        
        # Parse metadata if provided
        meta = {}
        if metadata:
            try:
                meta = json.loads(metadata)
            except:
                pass
        
        # Format based on document type
        formatted_content = _format_document(document_type, title, content, meta)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_title = "".join(c if c.isalnum() or c in (' ', '-', '_') else '' for c in title)
        safe_title = safe_title.replace(' ', '_')[:50]
        base_filename = f"{document_type}_{safe_title}_{timestamp}"
        
        # Save Markdown version
        md_filename = f"{base_filename}.md"
        md_path = os.path.join(GENERATED_DIR, md_filename)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(formatted_content)
        
        # Generate PDF version
        pdf_filename = f"{base_filename}.pdf"
        pdf_path = os.path.join(GENERATED_DIR, pdf_filename)
        _generate_pdf(formatted_content, pdf_path, title, document_type, meta)
        
        logger.info(f"Generated documents: {md_filename}, {pdf_filename}")
        
        # Return with special marker for frontend to detect
        return f"""**Document Generated**

📄 **{document_type.replace('_', ' ').title()}:** {title}

[DOWNLOAD_LINK:{pdf_filename}]

---

{formatted_content[:1500]}{"..." if len(formatted_content) > 1500 else ""}
"""
        
    except Exception as e:
        logger.error(f"Error generating document: {e}")
        return f"Error generating document: {str(e)}"


def _generate_pdf(content: str, pdf_path: str, title: str, doc_type: str, meta: dict):
    """Generate a properly formatted legal PDF."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.colors import HexColor
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
        
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )
        
        # Custom styles for legal documents
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'LegalTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=HexColor('#1a1a1a')
        )
        
        # Subtitle/metadata style
        meta_style = ParagraphStyle(
            'LegalMeta',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_CENTER,
            textColor=HexColor('#666666')
        )
        
        # Section header style
        section_style = ParagraphStyle(
            'LegalSection',
            parent=styles['Heading2'],
            fontSize=12,
            spaceBefore=18,
            spaceAfter=8,
            textColor=HexColor('#333333'),
            fontName='Helvetica-Bold'
        )
        
        # Body text style
        body_style = ParagraphStyle(
            'LegalBody',
            parent=styles['Normal'],
            fontSize=11,
            leading=16,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
            textColor=HexColor('#1a1a1a')
        )
        
        # Build PDF content
        story = []
        
        # Header
        date = meta.get('date', datetime.now().strftime("%B %d, %Y"))
        doc_type_display = doc_type.replace('_', ' ').upper()
        
        story.append(Paragraph(doc_type_display, meta_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 6))
        story.append(Paragraph(f"Date: {date}", meta_style))
        
        if meta.get('case_number'):
            story.append(Paragraph(f"Case No.: {meta['case_number']}", meta_style))
        if meta.get('client'):
            story.append(Paragraph(f"Client: {meta['client']}", meta_style))
        
        story.append(Spacer(1, 12))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#cccccc')))
        story.append(Spacer(1, 18))
        
        # Parse markdown content and convert to PDF elements
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 6))
            elif line.startswith('## '):
                story.append(Paragraph(line[3:], section_style))
            elif line.startswith('### '):
                story.append(Paragraph(line[4:], section_style))
            elif line.startswith('# '):
                pass  # Skip title, already added
            elif line.startswith('**') and line.endswith('**'):
                # Bold line
                story.append(Paragraph(f"<b>{line[2:-2]}</b>", body_style))
            elif line.startswith('---'):
                story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#dddddd')))
            elif line.startswith('*') and line.endswith('*'):
                # Italic
                story.append(Paragraph(f"<i>{line[1:-1]}</i>", body_style))
            else:
                # Clean up markdown formatting for PDF
                clean_line = line.replace('**', '').replace('*', '')
                if clean_line:
                    story.append(Paragraph(clean_line, body_style))
        
        # Footer
        story.append(Spacer(1, 24))
        story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#cccccc')))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            f"<i>Generated by Legal Agent on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</i>",
            meta_style
        ))
        
        doc.build(story)
        
    except ImportError as e:
        logger.warning(f"PDF generation skipped (missing dependency): {e}")
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")


def _format_document(doc_type: str, title: str, content: str, meta: dict) -> str:
    """Format document based on type (Markdown)."""
    
    date = meta.get('date', datetime.now().strftime("%B %d, %Y"))
    author = meta.get('author', 'Legal Agent')
    case_number = meta.get('case_number', '')
    client = meta.get('client', '')
    
    header = f"""# {title}

**Date:** {date}  
**Prepared by:** {author}
"""
    
    if case_number:
        header += f"**Case No.:** {case_number}  \n"
    if client:
        header += f"**Client:** {client}  \n"
    
    header += "\n---\n\n"
    
    if doc_type == "memo":
        return header + f"""## MEMORANDUM

**RE:** {title}

### Summary

{content}

---

*This memorandum is prepared for internal use only.*
"""
    
    elif doc_type == "brief":
        return header + f"""## LEGAL BRIEF

### Statement of Facts

{content}

### Conclusion

[To be completed based on further analysis]

---

*Respectfully submitted.*
"""
    
    elif doc_type == "summary":
        return header + f"""## CASE SUMMARY

{content}

---

*Summary prepared for quick reference.*
"""
    
    elif doc_type == "outline":
        return header + f"""## ARGUMENT OUTLINE

{content}

---

*This outline is intended as a framework for oral argument.*
"""
    
    elif doc_type == "contract_draft":
        return header + f"""## CONTRACT DRAFT

### TERMS AND CONDITIONS

{content}

---

*DRAFT - For review purposes only. Not a final agreement.*
"""
    
    elif doc_type == "letter":
        return header + f"""{content}

---

Sincerely,

{author}
"""
    
    else:
        return header + content
