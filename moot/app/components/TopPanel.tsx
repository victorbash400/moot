'use client';

import { FC } from "react";
import { X, BookOpen, ExternalLink } from "lucide-react";

type Citation = {
  title: string;
  reference: string;
  relevance: string;
};

type TopPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  citations?: Citation[];
};

export const TopPanel: FC<TopPanelProps> = ({
  isOpen,
  onClose,
  citations = [
    {
      title: "Federal Rules of Civil Procedure",
      reference: "Rule 56(c)",
      relevance: "Summary judgment standards"
    },
    {
      title: "Celotex Corp. v. Catrett",
      reference: "477 U.S. 317 (1986)",
      relevance: "Burden of proof in summary judgment"
    }
  ]
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-white/95 backdrop-blur-lg border-l border-gray-200/60 shadow-2xl z-40 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200/60">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-[#8c5a2d]" />
          <h2 className="text-lg font-semibold text-gray-900">Citations & References</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {citations.map((citation, index) => (
          <div
            key={index}
            className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/40 hover:border-gray-300 hover:bg-gray-100/80 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#8c5a2d]">
                  {citation.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  {citation.reference}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {citation.relevance}
                </p>
              </div>
              <button className="p-1.5 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <ExternalLink size={14} className="text-gray-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white to-transparent">
        <div className="text-xs text-center text-gray-500">
          Citations generated during session
        </div>
      </div>
    </div>
  );
};
