'use client';

import { FC } from "react";
import { X, ExternalLink, FileText, Download, ChevronRight } from "lucide-react";

export interface Citation {
  id: string;
  type: 'source' | 'document' | 'link';
  title: string;
  url?: string;
  date?: string;
  snippet?: string;
}

interface CitationsPanelProps {
  citations: Citation[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const CitationsPanel: FC<CitationsPanelProps> = ({ citations, isOpen, onClose, onOpen }) => {
  if (!isOpen) {
    // Collapsed state - just a tab
    return (
      <button
        onClick={onOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 bg-white border border-r-0 border-gray-200 rounded-l-lg px-2 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
          Sources {citations.length > 0 && `(${citations.length})`}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 z-40 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-700">Sources & Documents</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {citations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Sources and documents will appear here as the conversation progresses.
          </p>
        ) : (
          citations.map((citation) => (
            <div
              key={citation.id}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start gap-2">
                {citation.type === 'source' && (
                  <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                )}
                {citation.type === 'document' && (
                  <Download className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                )}
                {citation.type === 'link' && (
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {citation.title}
                  </p>
                  {citation.date && (
                    <p className="text-xs text-gray-400 mt-0.5">{citation.date}</p>
                  )}
                  {citation.snippet && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {citation.snippet}
                    </p>
                  )}
                  {citation.url && (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#6F4E37] hover:underline mt-1 inline-block truncate max-w-full"
                    >
                      {citation.url.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      {citations.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Click any source to open in new tab
          </p>
        </div>
      )}
    </div>
  );
};

export default CitationsPanel;
