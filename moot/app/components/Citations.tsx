import React from 'react';

interface CitationsProps {
    citations: string[];
}

const Citations: React.FC<CitationsProps> = ({ citations }) => {
    if (!citations || citations.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Sources & Citations</p>
            <div className="space-y-1">
                {citations.map((citation, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-500 mt-0.5">
                            {index + 1}
                        </span>
                        <a href="#" className="hover:text-[#365c12] hover:underline break-all">
                            {citation}
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Citations;
