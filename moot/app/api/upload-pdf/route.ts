/**
 * Upload PDF API Route
 * 
 * Handle PDF file uploads with text extraction using unpdf.
 * unpdf is designed for serverless environments and works well with Next.js.
 */

import { NextRequest, NextResponse } from 'next/server';
import { addDocument } from '../../lib/tools/document-reader';
import { extractText } from 'unpdf';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const sessionId = formData.get('session_id') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Generate file ID
        const fileId = crypto.randomUUID();

        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        let textContent = '';

        // Extract text based on file type
        if (file.name.toLowerCase().endsWith('.pdf')) {
            try {
                // Use unpdf for reliable text extraction in serverless environments
                const { text } = await extractText(buffer);
                textContent = text;
                console.log(`PDF parsed successfully: ${file.name} (${text.length} chars)`);
            } catch (error) {
                console.error('Error parsing PDF:', error);
                // Fallback: store metadata if extraction fails
                textContent = `[PDF Document: ${file.name}] Size: ${buffer.length} bytes. Note: PDF text extraction failed.`;
            }
        } else if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) {
            textContent = Buffer.from(buffer).toString('utf-8');
        } else {
            // For other file types, try to read as text
            textContent = Buffer.from(buffer).toString('utf-8');
        }

        // Add to document store with session scope
        // Use 'global' as fallback if no session provided (for backwards compatibility)
        const effectiveSessionId = sessionId || 'global';
        await addDocument(effectiveSessionId, fileId, file.name, textContent, file.type);

        console.log(`Uploaded file: ${file.name} (${buffer.length} bytes)`);

        return NextResponse.json({
            file_id: fileId,
            filename: file.name,
            status: 'ready'
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}
