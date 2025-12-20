'use client';

import { FC, useState, useMemo } from "react";
import { X, ExternalLink, FileText, Download, ChevronRight, ChevronDown, Upload, FilePlus, Globe } from "lucide-react";

export interface Citation {
  id: string;
  type: 'source' | 'document' | 'generated' | 'uploaded';
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

interface GroupProps {
  title: string;
  icon: React.ReactNode;
  items: Citation[];
  defaultOpen?: boolean;
  accentColor?: string;
}

const CitationGroup: FC<GroupProps> = ({ title, icon, items, defaultOpen = true, accentColor = 'text-gray-500' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className={accentColor}>{icon}</span>
        <span className="uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
          {items.length}
        </span>
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1.5 pl-5">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              download={item.type === 'document' || item.type === 'generated' || item.type === 'uploaded' ? true : undefined}
              target={item.type === 'source' ? '_blank' : undefined}
              rel={item.type === 'source' ? 'noopener noreferrer' : undefined}
              className="block p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate leading-tight">
                    {item.title}
                  </p>
                  {item.snippet && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  )}
                </div>
                {item.type === 'source' && (
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                )}
                {(item.type === 'generated' || item.type === 'document' || item.type === 'uploaded') && (
                  <Download className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export const CitationsPanel: FC<CitationsPanelProps> = ({ citations, isOpen, onClose, onOpen }) => {
  // Group citations by type
  const grouped = useMemo(() => {
    const uploaded: Citation[] = [];
    const generated: Citation[] = [];
    const sources: Citation[] = [];

    for (const c of citations) {
      if (c.type === 'uploaded') {
        uploaded.push(c);
      } else if (c.type === 'generated' || c.type === 'document') {
        generated.push(c);
      } else {
        sources.push(c);
      }
    }

    return { uploaded, generated, sources };
  }, [citations]);

  const totalCount = citations.length;

  if (!isOpen) {
    // Collapsed state - just a tab
    return (
      <button
        onClick={onOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 bg-white border border-r-0 border-gray-200 rounded-l-lg px-2 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
          Sources {totalCount > 0 && `(${totalCount})`}
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
      <div className="flex-1 overflow-y-auto p-3">
        {totalCount === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Sources and documents will appear here
            </p>
          </div>
        ) : (
          <>
            <CitationGroup
              title="Your Documents"
              icon={<Upload className="w-3.5 h-3.5" />}
              items={grouped.uploaded}
              accentColor="text-[#6F4E37]"
            />
            <CitationGroup
              title="Generated"
              icon={<FilePlus className="w-3.5 h-3.5" />}
              items={grouped.generated}
              accentColor="text-gray-600"
            />
            <CitationGroup
              title="Citations"
              icon={<Globe className="w-3.5 h-3.5" />}
              items={grouped.sources}
              accentColor="text-blue-500"
            />
          </>
        )}
      </div>

      {/* Footer hint */}
      {totalCount > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Click to download or open in new tab
          </p>
        </div>
      )}
    </div>
  );
};

export default CitationsPanel;
