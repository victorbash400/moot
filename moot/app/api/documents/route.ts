/**
 * Documents API Route
 * 
 * List and download generated documents.
 * Replaces the Python FastAPI /documents endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeneratedDocument, listGeneratedDocuments } from '../../lib/tools/document-generator';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    // If filename provided, download that document
    if (filename) {
        // Security: Only allow alphanumeric, underscore, dash, and dots
        const safeChars = /^[a-zA-Z0-9_\-.]+$/;
        if (!safeChars.test(filename)) {
            return NextResponse.json(
                { error: 'Invalid filename' },
                { status: 400 }
            );
        }

        const doc = getGeneratedDocument(filename);

        if (!doc) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // PDF documents are stored as base64
        if (doc.type === 'pdf') {
            const pdfBuffer = Buffer.from(doc.content, 'base64');
            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`
                }
            });
        }

        // Markdown/text documents
        const contentType = filename.endsWith('.md')
            ? 'text/markdown'
            : 'text/plain';

        return new NextResponse(doc.content, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });
    }

    // Otherwise, list all documents
    const documents = listGeneratedDocuments();

    return NextResponse.json({
        documents: documents.map(doc => ({
            filename: doc.filename,
            type: doc.type
        }))
    });
}
