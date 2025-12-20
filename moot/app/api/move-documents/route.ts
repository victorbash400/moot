/**
 * Move Documents API Route
 * 
 * Move documents from one session (e.g., 'staging') to another session.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.documents.json');

interface DocumentItem {
    name: string;
    content: string;
    type: string;
}

interface DocumentStore {
    [sessionId: string]: {
        [docId: string]: DocumentItem;
    };
}

function loadStore(): DocumentStore {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load document store:', e);
    }
    return {};
}

function saveStore(store: DocumentStore) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save document store:', e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { from_session, to_session, document_ids } = body;

        if (!from_session || !to_session) {
            return NextResponse.json(
                { error: 'from_session and to_session are required' },
                { status: 400 }
            );
        }

        const store = loadStore();
        const sourceSession = store[from_session] || {};

        if (!store[to_session]) {
            store[to_session] = {};
        }

        let movedCount = 0;

        // If document_ids provided, move only those; otherwise move all
        const idsToMove = document_ids || Object.keys(sourceSession);

        for (const docId of idsToMove) {
            if (sourceSession[docId]) {
                store[to_session][docId] = sourceSession[docId];
                delete sourceSession[docId];
                movedCount++;
                console.log(`Moved document ${docId} from ${from_session} to ${to_session}`);
            }
        }

        // Update source session
        store[from_session] = sourceSession;

        // Clean up empty source session
        if (Object.keys(sourceSession).length === 0) {
            delete store[from_session];
        }

        saveStore(store);

        return NextResponse.json({
            success: true,
            moved_count: movedCount
        });

    } catch (error) {
        console.error('Move documents error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Move failed' },
            { status: 500 }
        );
    }
}
