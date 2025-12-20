/**
 * Document Generator Tool
 * 
 * Generates formatted legal documents as PDF using jsPDF.
 * Returns the document content with a download link marker for the frontend.
 */

import { z } from 'zod';
import { jsPDF } from 'jspdf';
import { addDocument } from './document-reader';

// Zod schema for tool parameters
export const documentGeneratorSchema = z.object({
    document_type: z.enum(['memo', 'brief', 'summary', 'outline', 'contract_draft', 'letter'])
        .describe("Type of document to generate"),
    title: z.string().describe("Title of the document"),
    content: z.string().describe("The main content/body of the document"),
    metadata: z.string().optional().describe("Optional JSON string with additional info like case_number, client, date, author")
});

export type DocumentGeneratorParams = z.infer<typeof documentGeneratorSchema>;

interface DocumentMetadata {
    date?: string;
    author?: string;
    case_number?: string;
    client?: string;
}

// Store for generated documents (base64 encoded for PDFs)
const generatedDocuments = new Map<string, { content: string; type: string; mimeType: string }>();

/**
 * Get a generated document by filename
 */
export function getGeneratedDocument(filename: string): { content: string; type: string; mimeType: string } | undefined {
    return generatedDocuments.get(filename);
}

/**
 * List all generated documents
 */
export function listGeneratedDocuments(): Array<{ filename: string; type: string }> {
    return Array.from(generatedDocuments.entries()).map(([filename, doc]) => ({
        filename,
        type: doc.type
    }));
}

/**
 * Generate a formatted legal document as PDF.
 */
export async function generateDocument({
    document_type,
    title,
    content,
    metadata
}: DocumentGeneratorParams): Promise<string> {
    try {
        // Parse metadata if provided
        let meta: DocumentMetadata = {};
        if (metadata) {
            try {
                meta = JSON.parse(metadata);
            } catch {
                // Ignore parse errors
            }
        }

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeTitle = title
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 50);
        const filename = `${document_type}_${safeTitle}_${timestamp}.pdf`;

        // Generate PDF
        const pdfBase64 = generatePDF(document_type, title, content, meta);

        // Store the document
        generatedDocuments.set(filename, {
            content: pdfBase64,
            type: 'pdf',
            mimeType: 'application/pdf'
        });

        console.log(`Generated document: ${filename}`);

        // Automatically add to readable document store so the agent can read it back
        // We store the markdown/text content, not the PDF binary
        // Use getSessionContext to get the current session for document scoping
        const { getSessionContext } = await import('./document-reader');
        const sessionId = getSessionContext() || 'global';
        await addDocument(sessionId, filename, filename, content, 'generated');

        // Format markdown preview
        const formattedContent = formatMarkdownPreview(document_type, title, content, meta);
        const preview = formattedContent.slice(0, 1500);
        const truncated = formattedContent.length > 1500 ? '...' : '';

        // Return with special marker for frontend to detect
        return `**Document Generated**

📄 **${document_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:** ${title}

[DOWNLOAD_LINK:${filename}]

---

${preview}${truncated}`;

    } catch (error) {
        console.error('Error generating document:', error);
        return `Error generating document: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

/**
 * Generate PDF using jsPDF
 */
function generatePDF(
    docType: string,
    title: string,
    content: string,
    meta: DocumentMetadata
): string {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 72; // 1 inch margin
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    const date = meta.date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const author = meta.author || 'Legal Agent';
    const docTypeDisplay = docType.replace('_', ' ').toUpperCase();

    // Header - document type (smaller, centered)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(docTypeDisplay, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Title (large, centered)
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(title, contentWidth);
    doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += titleLines.length * 20 + 10;

    // Date and metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${date}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    if (meta.case_number) {
        doc.text(`Case No.: ${meta.case_number}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
    }

    if (meta.client) {
        doc.text(`Client: ${meta.client}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
    }

    // Horizontal rule
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 25;

    // Body content
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'normal');

    // Parse content and add sections
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check for page overflow
        if (yPos > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
        }

        if (!trimmedLine) {
            yPos += 10;
            continue;
        }

        // Handle section headers
        if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
            const headerText = trimmedLine.replace(/^#+\s*/, '');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            yPos += 10;
            doc.text(headerText, margin, yPos);
            yPos += 18;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
        } else if (trimmedLine.startsWith('# ')) {
            // Skip main title, already added
            continue;
        } else {
            // Regular paragraph text
            const cleanLine = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');
            const wrappedLines = doc.splitTextToSize(cleanLine, contentWidth);

            for (const wLine of wrappedLines) {
                if (yPos > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(wLine, margin, yPos);
                yPos += 16;
            }
        }
    }

    // Footer
    yPos += 20;
    if (yPos > doc.internal.pageSize.getHeight() - margin - 40) {
        doc.addPage();
        yPos = margin;
    }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated by Legal Agent on ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 12;
    doc.text(`Prepared by: ${author}`, margin, yPos);

    // Return base64 string
    return doc.output('datauristring').split(',')[1];
}

/**
 * Format markdown preview (for display in chat)
 */
function formatMarkdownPreview(
    docType: string,
    title: string,
    content: string,
    meta: DocumentMetadata
): string {
    const date = meta.date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const author = meta.author || 'Legal Agent';

    let header = `# ${title}

**Date:** ${date}  
**Prepared by:** ${author}
`;

    if (meta.case_number) {
        header += `**Case No.:** ${meta.case_number}  \n`;
    }
    if (meta.client) {
        header += `**Client:** ${meta.client}  \n`;
    }

    header += '\n---\n\n';

    switch (docType) {
        case 'memo':
            return header + `## MEMORANDUM

**RE:** ${title}

### Summary

${content}

---

*This memorandum is prepared for internal use only.*
`;

        case 'brief':
            return header + `## LEGAL BRIEF

### Statement of Facts

${content}

### Conclusion

[To be completed based on further analysis]

---

*Respectfully submitted.*
`;

        case 'summary':
            return header + `## CASE SUMMARY

${content}

---

*Summary prepared for quick reference.*
`;

        case 'outline':
            return header + `## ARGUMENT OUTLINE

${content}

---

*This outline is intended as a framework for oral argument.*
`;

        case 'contract_draft':
            return header + `## CONTRACT DRAFT

### TERMS AND CONDITIONS

${content}

---

*DRAFT - For review purposes only. Not a final agreement.*
`;

        case 'letter':
            return header + `${content}

---

Sincerely,

${author}
`;

        default:
            return header + content;
    }
}

export default generateDocument;
