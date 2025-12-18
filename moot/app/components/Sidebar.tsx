"use client";

import { FC, useState, useEffect } from "react";
import {
    Settings,
    HelpCircle,
    FileText,
    Globe,
    Scale,
    BookOpen,
    ChevronDown,
    ChevronUp
} from "lucide-react";

type SidebarProps = {
    isExpanded: boolean;
    onToggle: (expanded: boolean) => void;
    onVoiceSelect?: (voiceId: string) => void;
};

export const Sidebar: FC<SidebarProps> = ({ isExpanded, onToggle, onVoiceSelect }) => {
    const [sessionConfigExpanded, setSessionConfigExpanded] = useState(true);
    const [toolsExpanded, setToolsExpanded] = useState(true);
    const [voices, setVoices] = useState<any[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [voiceError, setVoiceError] = useState(false);

    const fetchVoices = async () => {
        setIsLoadingVoices(true);
        setVoiceError(false);
        try {
            const res = await fetch("http://localhost:8000/voices");
            if (!res.ok) throw new Error("Backend offline");
            const data = await res.json();
            setVoices(data.voices || []);
        } catch (err) {
            setVoiceError(true);
            // Silent catch to avoid console noise
        } finally {
            setIsLoadingVoices(false);
        }
    };

    // Load voices only when expanding session config or on explicit interaction
    useEffect(() => {
        if (sessionConfigExpanded && voices.length === 0 && !voiceError) {
            fetchVoices();
        }
    }, [sessionConfigExpanded]);

    return (
        <aside
            onMouseEnter={() => onToggle(true)}
            onMouseLeave={() => onToggle(false)}
            className={`fixed left-0 top-0 z-50 flex h-full flex-col bg-[#F8F9FB] text-slate-600 transition-all duration-300 ease-in-out ${isExpanded ? "w-72 shadow-xl" : "w-20"
                }`}
        >
            {/* Branding */}
            <div className="flex h-24 items-center px-6">
                <div className="flex items-center gap-4">
                    <img src="/moot_logo.svg" alt="moot logo" className="h-8 w-8 shrink-0 object-contain" />
                    <div
                        className={`flex flex-col transition-all duration-300 ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none absolute"}`}
                    >
                        <span className="text-xl font-bold tracking-tight text-slate-900">moot</span>
                    </div>
                </div>
            </div>

            {/* Main Content - Only show when expanded */}
            <div className={`flex-1 overflow-y-auto px-4 py-6 space-y-6 ${isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>

                {/* Session Configuration */}
                <div className="space-y-3">
                    <button
                        onClick={() => setSessionConfigExpanded(!sessionConfigExpanded)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-slate-900 uppercase tracking-wider"
                    >
                        <span>Session Setup</span>
                        {sessionConfigExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {sessionConfigExpanded && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-600 mb-1 block">Case Type</label>
                                <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>Contract Dispute</option>
                                    <option>Criminal Defense</option>
                                    <option>Civil Rights</option>
                                    <option>Personal Injury</option>
                                    <option>Corporate Law</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 mb-1 block">AI Difficulty</label>
                                <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>Beginner</option>
                                    <option>Intermediate</option>
                                    <option>Advanced</option>
                                    <option>Expert</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 mb-1 block">AI Persona</label>
                                <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>Opposing Counsel</option>
                                    <option>Judge</option>
                                    <option>Witness</option>
                                    <option>Expert Witness</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs text-slate-600">Voice Preference</label>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fetchVoices(); }}
                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium uppercase tracking-wider"
                                        title="Refresh voices"
                                    >
                                        {isLoadingVoices ? "Loading..." : "Refresh"}
                                    </button>
                                </div>
                                <select
                                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${voiceError ? "border-red-300 text-red-500" : "border-slate-200"
                                        }`}
                                    onChange={(e) => onVoiceSelect?.(e.target.value)}
                                    disabled={isLoadingVoices || voiceError}
                                >
                                    <option value="">
                                        {voiceError ? "Backend Offline (Check Connection)" : "Default (No Voice)"}
                                    </option>
                                    {voices.map((voice: any) => (
                                        <option key={voice.voice_id} value={voice.voice_id}>
                                            {voice.name} ({voice.category})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Context Input */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-600" />
                        <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Case Context</span>
                    </div>
                    <textarea
                        placeholder="Paste case details, key facts, or arguments..."
                        className="w-full h-32 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                </div>

                {/* AI Tools */}
                <div className="space-y-3">
                    <button
                        onClick={() => setToolsExpanded(!toolsExpanded)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-slate-900 uppercase tracking-wider"
                    >
                        <span>AI Capabilities</span>
                        {toolsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {toolsExpanded && (
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <div className="flex items-center gap-2 flex-1">
                                    <Globe size={16} className="text-slate-600" />
                                    <span className="text-sm text-slate-700">Web Search</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <div className="flex items-center gap-2 flex-1">
                                    <Scale size={16} className="text-slate-600" />
                                    <span className="text-sm text-slate-700">Case Law Access</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <div className="flex items-center gap-2 flex-1">
                                    <BookOpen size={16} className="text-slate-600" />
                                    <span className="text-sm text-slate-700">Legal Citations</span>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* Session History */}
                <div className="space-y-3">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Recent Sessions</span>
                    <div className="space-y-2">
                        <button className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 transition-colors">
                            <div className="text-sm font-medium text-slate-900">Contract Arbitration</div>
                            <div className="text-xs text-slate-500 mt-1">2 hours ago • 23 min</div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Collapsed Icons - Only show when collapsed */}
            <nav className={`flex-1 px-4 py-6 space-y-2 ${!isExpanded ? "opacity-100" : "opacity-0 pointer-events-none absolute"}`}>
                <button className="group flex w-full items-center justify-center rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <Settings className="h-5 w-5 shrink-0" />
                </button>
                <button className="group flex w-full items-center justify-center rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <FileText className="h-5 w-5 shrink-0" />
                </button>
                <button className="group flex w-full items-center justify-center rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <Globe className="h-5 w-5 shrink-0" />
                </button>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 space-y-2 border-t border-slate-100">
                <button className="group flex w-full items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
                        Settings
                    </span>
                </button>
                <button className="group flex w-full items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <HelpCircle className="h-5 w-5 shrink-0" />
                    <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
                        Support
                    </span>
                </button>
            </div>
        </aside>
    );
};
