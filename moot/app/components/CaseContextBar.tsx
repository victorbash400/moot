'use client';

import { FC } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface CaseContext {
    caseType: string;
    difficulty: string;
    description: string;
    aiPersona: string; // 'assistant' | 'opposing_counsel' | 'judge' | 'witness' | 'mentor'
    uploadedFiles: { id: string; name: string }[];
    pendingFiles?: File[]; // Raw files to be uploaded after session creation
    aiSummary?: string;
}

interface CaseContextBarProps {
    context: CaseContext | null;
    isExpanded: boolean;
    onToggle: () => void;
}

export const CaseContextBar: FC<CaseContextBarProps> = ({ context, isExpanded, onToggle }) => {
    if (!context) return null;

    return (
        <div className="w-full mb-4">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all"
            >
                <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-gray-700">{context.caseType}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{context.difficulty}</span>
                    {context.uploadedFiles.length > 0 && (
                        <>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-500">{context.uploadedFiles.length} doc{context.uploadedFiles.length > 1 ? 's' : ''}</span>
                        </>
                    )}
                    {context.aiSummary && (
                        <>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-400 italic truncate max-w-xs hidden sm:block">{context.aiSummary}</span>
                        </>
                    )}
                </div>

                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {isExpanded && (
                <div className="mt-2 px-4 py-4 bg-white border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Case Type</p>
                            <p className="text-gray-700">{context.caseType}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Difficulty</p>
                            <p className="text-gray-700">{context.difficulty}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Context</p>
                            <p className="text-gray-600">{context.description}</p>
                        </div>
                        {context.uploadedFiles.length > 0 && (
                            <div className="col-span-2">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Documents</p>
                                <p className="text-gray-600">{context.uploadedFiles.map(f => f.name).join(', ')}</p>
                            </div>
                        )}
                        <div className="col-span-2">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tools</p>
                            <p className="text-gray-500">Search, Document Reader, Document Generator</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseContextBar;
