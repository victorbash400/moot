'use client';

import { FC, useState, useCallback } from "react";
import { Upload, ArrowRight, X, FileText } from "lucide-react";
import { CaseContext } from "./CaseContextBar";

interface CaseSetupProps {
    onComplete: (context: CaseContext) => void;
    onCancel?: () => void;
}

const CASE_TYPES = [
    'Contract Law',
    'Constitutional Law',
    'Criminal Law',
    'Civil Rights',
    'Corporate Law',
    'Employment Law',
    'Intellectual Property',
    'Family Law',
    'Immigration Law',
    'Other'
];

const DIFFICULTY_LEVELS = [
    { value: 'Beginner', label: 'I' },
    { value: 'Intermediate', label: 'II' },
    { value: 'Advanced', label: 'III' },
    { value: 'Expert', label: 'IV' },
];

export const CaseSetup: FC<CaseSetupProps> = ({ onComplete, onCancel }) => {
    const [caseType, setCaseType] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [description, setDescription] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string }[]>([]);
    const [error, setError] = useState('');

    const isValid = caseType && difficulty && description.trim().length >= 10;

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('http://localhost:8000/upload-pdf', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                setUploadedFiles(prev => [...prev, { id: data.file_id, name: file.name }]);
            } catch (err) {
                console.error('Upload failed:', err);
            }
        }
        e.target.value = '';
    }, []);

    const removeFile = useCallback((id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const handleStart = useCallback(() => {
        if (!isValid) {
            setError('Please fill in all required fields');
            return;
        }

        // Simple summary without API call - keeps session management clean
        const summary = description.length > 60
            ? description.substring(0, 60) + '...'
            : description;

        onComplete({
            caseType,
            difficulty,
            description,
            uploadedFiles,
            aiSummary: summary,
        });
    }, [caseType, difficulty, description, uploadedFiles, isValid, onComplete]);

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="border border-gray-200 rounded-xl bg-white p-6 space-y-5">
                {/* Header */}
                <div className="text-center pb-2">
                    <h2 className="text-xl font-medium text-gray-800">New Case</h2>
                    <p className="text-sm text-gray-500 mt-1">Define context before starting</p>
                </div>

                {/* Case Type */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Case Type
                    </label>
                    <select
                        value={caseType}
                        onChange={(e) => setCaseType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-gray-300 transition-all"
                    >
                        <option value="">Select...</option>
                        {CASE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Difficulty */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Difficulty
                    </label>
                    <div className="flex gap-2">
                        {DIFFICULTY_LEVELS.map(level => (
                            <button
                                key={level.value}
                                onClick={() => setDifficulty(level.value)}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${difficulty === level.value
                                    ? 'bg-[#6F4E37] text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="text-center">
                                    <span className="block text-xs opacity-60">{level.label}</span>
                                    <span className="block mt-0.5">{level.value}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Case Description */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Context
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the case, key issues, or what you're preparing for..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-700 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-300 resize-none transition-all"
                    />
                </div>

                {/* File Upload */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Documents <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Upload files</span>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>

                    {uploadedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {uploadedFiles.map(file => (
                                <span key={file.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded text-xs text-gray-600">
                                    <FileText className="w-3 h-3" />
                                    {file.name}
                                    <button onClick={() => removeFile(file.id)} className="ml-1 hover:text-gray-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}

                {/* Submit */}
                <button
                    onClick={handleStart}
                    disabled={!isValid}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-medium text-sm transition-all ${isValid
                        ? 'bg-[#6F4E37] text-white hover:bg-[#5D4037]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <span>Start Session</span>
                    <ArrowRight className="w-4 h-4" />
                </button>

                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default CaseSetup;
