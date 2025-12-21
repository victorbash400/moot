/**
 * Chat API Route
 * 
 * Streaming chat endpoint using Google ADK with proper session management.
 * Replaces the Python FastAPI /chat/stream endpoint.
 */

import { NextRequest } from 'next/server';
import { Runner, StreamingMode, isFinalResponse } from '@google/adk';
import { Content, Part } from '@google/genai';
import { legalAgent, sessionService, APP_NAME, PERSONA_INSTRUCTIONS } from '../../lib/agent/legal-agent';
import { generateSpeech, stripMarkdown } from '../../lib/services/voice-service';
import { ChatRequest } from '../../lib/types';
import { setSessionContext } from '../../lib/tools/document-reader';

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    // Create a streaming response
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const body: ChatRequest = await request.json();
                const { message, user_id = 'default_user', session_id, voice_id, case_context } = body;

                // Generate or reuse session ID
                const currentSessionId = session_id || crypto.randomUUID();
                sendEvent({ type: 'session', session_id: currentSessionId });

                // Ensure session exists - ADK handles session memory automatically
                let session = await sessionService.getSession({
                    appName: APP_NAME,
                    userId: user_id,
                    sessionId: currentSessionId
                });

                if (!session) {
                    session = await sessionService.createSession({
                        appName: APP_NAME,
                        userId: user_id,
                        sessionId: currentSessionId,
                        state: {}  // initial state
                    });
                    console.log(`Created new session: ${currentSessionId}`);
                } else {
                    console.log(`Using existing session: ${currentSessionId} (${session.events?.length || 0} events)`);
                }

                // Build user message with case context if first message
                let userMessage = message;
                if (case_context && (!session.events || session.events.length === 0)) {
                    const persona = case_context.ai_persona || 'assistant';
                    const personaBehavior = PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS.assistant;

                    const contextPrefix = `[CASE CONTEXT]
Case Type: ${case_context.case_type}
Difficulty: ${case_context.difficulty}
${case_context.uploaded_files ? `Available Documents: ${case_context.uploaded_files.join(', ')}` : ''}

**YOUR ROLE: ${persona.toUpperCase().replace('_', ' ')}**
${personaBehavior}
[END CONTEXT]

`;
                    userMessage = contextPrefix + message;
                }

                // Create Runner with session service - ADK handles history automatically
                const runner = new Runner({
                    agent: legalAgent,
                    appName: APP_NAME,
                    sessionService: sessionService
                });

                // Set session context for document tools so they can access session-scoped docs
                setSessionContext(currentSessionId);

                // Create the user message content
                const userContent: Content = {
                    role: 'user',
                    parts: [{ text: userMessage } as Part]
                };

                // Run the agent with streaming
                let fullTextResponse = '';

                const events = runner.runAsync({
                    userId: user_id,
                    sessionId: currentSessionId,
                    // Cast to any to avoid version mismatch between @google/genai versions
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    newMessage: userContent as any,
                    runConfig: {
                        streamingMode: StreamingMode.SSE
                    }
                });

                // Process events from the agent
                for await (const event of events) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const eventAny = event as any;

                    // Check if this event has functionResponse - we ALWAYS need to process those
                    const hasFunctionResponse = event.content?.parts?.some((p: unknown) => (p as Record<string, unknown>).functionResponse);

                    // Skip the final complete message if we already streamed partial events
                    // BUT never skip events with functionResponse - we need those for markers
                    if (!hasFunctionResponse && (eventAny.partial === false || (eventAny.content && !eventAny.partial && fullTextResponse.length > 0))) {
                        console.log('Skipping final non-partial event (already streamed)');
                        continue;
                    }

                    // Handle tool calls
                    if (event.content?.parts) {
                        for (const part of event.content.parts) {
                            console.log('Part content:', JSON.stringify(part, null, 2));

                            // Tool call started
                            if (part.functionCall) {
                                sendEvent({
                                    type: 'tool_call',
                                    tool_name: part.functionCall.name
                                });
                                console.log(`Tool call: ${part.functionCall.name}`);
                            }

                            // Tool response - extract citations
                            if (part.functionResponse) {
                                const responseText = String(part.functionResponse.response?.result || '');

                                // Extract and emit citations
                                // Use a more robust regex that handles potential newlines or spacing in JSON
                                const citationPattern = /\[CITATION:(\{[\s\S]*?\})\]/g;
                                let match;
                                while ((match = citationPattern.exec(responseText)) !== null) {
                                    try {
                                        const jsonStr = match[1];
                                        const citationData = JSON.parse(jsonStr);
                                        sendEvent({
                                            type: 'citation',
                                            citation_type: 'source',
                                            title: citationData.title || 'Source',
                                            url: citationData.url,
                                            date: citationData.date,
                                            snippet: citationData.snippet
                                        });
                                        console.log(`Citation processed: ${citationData.title}`);
                                    } catch (e) {
                                        console.error(`Failed to parse citation JSON: ${match[1]}`, e);
                                    }
                                }

                                // Extract DOWNLOAD_LINK markers
                                const downloadPattern = /\[DOWNLOAD_LINK:([^\]]+)\]/g;
                                while ((match = downloadPattern.exec(responseText)) !== null) {
                                    const filename = match[1];
                                    sendEvent({
                                        type: 'citation',
                                        citation_type: 'generated',
                                        title: filename.replace(/_/g, ' ').replace(/\.(pdf|md)$/, ''),
                                        url: `/api/documents?filename=${encodeURIComponent(filename)}`,
                                        snippet: 'AI-generated document'
                                    });
                                    console.log(`Generated document link emitted: ${filename}`);
                                }

                                // Extract LINK_PROVIDED markers
                                const linkPattern = /\[LINK_PROVIDED:([^|]+)\|([^|]+)\|([^\]]*)\]/g;
                                while ((match = linkPattern.exec(responseText)) !== null) {
                                    const [, title, url, description] = match;
                                    sendEvent({
                                        type: 'citation',
                                        citation_type: 'generated',
                                        title,
                                        url: url.startsWith('http') ? url : `/api/documents?filename=${encodeURIComponent(url)}`,
                                        snippet: description || 'AI-generated document'
                                    });
                                    console.log(`Link provided emitted: ${title}`);
                                }
                            }

                            // Text content (streaming or final)
                            if (part.text) {
                                console.log('Found text part:', part.text.substring(0, 30) + '...');
                                // Clean the text for display
                                // Remove CITATION markers and LINK_PROVIDED markers
                                // We use a global replace with dotAll to catch multiline JSON
                                const cleanText = part.text
                                    .replace(/\[CITATION:\{[\s\S]*?\}\]/g, '')
                                    .replace(/\[DOWNLOAD_LINK:[^\]]+\]/g, '') // Keep DOWNLOAD_LINK for ChatBubble? No, frontend handles event
                                    .replace(/\[LINK_PROVIDED:[^\]]+\]/g, '');

                                if (cleanText.trim()) {
                                    fullTextResponse += part.text;
                                    console.log('Sending content event');
                                    sendEvent({ type: 'content', content: cleanText });
                                }
                            } else {
                                console.log('Part has no text property');
                            }
                        }
                    } else {
                        console.log('Event has no content parts');
                    }

                    // Check if this is the final response using the standalone function
                    if (isFinalResponse(event)) {
                        console.log('✅ Final response received');
                    }
                }

                // Generate audio for the complete response if voice is selected
                if (voice_id && fullTextResponse.trim()) {
                    const sentences = fullTextResponse.split(/(?<=[.!?])\s+/);

                    for (const sentence of sentences) {
                        if (sentence.trim()) {
                            const cleanSentence = stripMarkdown(sentence);
                            if (cleanSentence) {
                                const audio = await generateSpeech(cleanSentence, voice_id);
                                if (audio) {
                                    sendEvent({ type: 'audio', data: audio });
                                }
                            }
                        }
                    }
                }

                sendEvent({ type: 'done' });

            } catch (error) {
                console.error('Chat error:', error);
                sendEvent({
                    type: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
