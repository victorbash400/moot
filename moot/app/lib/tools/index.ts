/**
 * Tools index - exports all tools for use with the agent
 */

export { webSearch, webSearchSchema, type WebSearchParams } from './web-search';
export { readDocument, documentReaderSchema, addDocument, getDocumentNames, clearDocuments, type DocumentReaderParams } from './document-reader';
export { generateDocument, documentGeneratorSchema, getGeneratedDocument, listGeneratedDocuments, type DocumentGeneratorParams } from './document-generator';
export { provideLink, provideLinkSchema, type ProvideLinkParams } from './provide-link';
