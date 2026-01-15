"use client";

import React, { useState, useEffect } from "react";
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    ChevronRight, 
    History,
    TerminalSquare,
    X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/workflowStore";
import { RunStatus } from "@/lib/types";

const StatusIcon = ({ status }: { status: RunStatus }) => {
    switch (status) {
        case 'success': return <CheckCircle2 size={13} className="text-[#dfff4f]" />;
        case 'failed': return <XCircle size={13} className="text-red-500" />;
        case 'running': return <Loader2 size={13} className="text-yellow-500 animate-spin" />;
        default: return <Clock size={13} className="text-gray-500" />;
    }
};

const StatusBadge = ({ status }: { status: RunStatus }) => {
    const styles = {
        success: "bg-[#dfff4f]/10 text-[#dfff4f] border-[#dfff4f]/20",
        failed: "bg-red-500/10 text-red-400 border-red-500/20",
        running: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        pending: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };

    return (
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-sm border font-bold uppercase tracking-wider", styles[status])}>
            {status}
        </span>
    );
};

export default function HistorySidebar() {
    // toggleHistory to actions
    const { isHistoryOpen, history, workflowId, loadHistory, toggleHistory } = useWorkflowStore();
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isHistoryOpen && workflowId) {
            const fetchData = async () => {
                setIsLoading(true);
                await loadHistory(workflowId);
                setIsLoading(false);
            };
            fetchData();
        }
    }, [isHistoryOpen, workflowId, loadHistory]);

    if (!isHistoryOpen) return null;

    return (
        <aside className="w-[340px] bg-[#09090b] border-l border-white/10 flex flex-col h-full z-20 shrink-0 transition-all duration-300 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#09090b]">
                <div className="flex items-center gap-2">
                    <History size={16} className="text-white/70" />
                    <span className="text-sm font-bold text-white">Run History</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/40">{history.length} Runs</span>
                    
                    {/* NEW: Close Button */}
                    <button 
                        onClick={toggleHistory}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-white"
                        title="Close History"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {isLoading && history.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-white/30 gap-2">
                        <Loader2 size={24} className="animate-spin" />
                        <span className="text-xs">Loading history...</span>
                    </div>
                )}

                {!isLoading && history.length === 0 && (
                    <div className="text-center py-12 text-white/20 text-xs flex flex-col items-center gap-2">
                        <TerminalSquare size={32} strokeWidth={1} />
                        No runs recorded yet.
                    </div>
                )}

                {history.map((run) => (
                    <div key={run.id} className="group">
                        {/* Run Summary Header */}
                        <div 
                            className="bg-[#1a1a1a] border border-white/5 hover:border-white/10 rounded-lg p-3 cursor-pointer transition-all"
                            onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                        >
                            {/* Top Row: Title + Status */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`transition-transform duration-200 ${expandedRunId === run.id ? "rotate-90" : ""}`}>
                                        <ChevronRight size={14} className="text-white/50" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white tracking-wide">
                                            Run #{run.id.slice(0, 5)}
                                        </span>
                                        <span className="text-[10px] text-white/40 font-mono mt-0.5">
                                            {run.timestamp}
                                        </span>
                                    </div>
                                </div>
                                <StatusBadge status={run.status} />
                            </div>

                            {/* Bottom Row: Scope + Duration */}
                            <div className="pl-6 flex items-center gap-3 text-[10px] text-white/40 font-medium">
                                <span className="bg-white/5 px-1.5 py-0.5 rounded text-white/60">
                                    {run.triggerType}
                                </span>
                                <span>{run.duration}</span>
                                {run.nodeExecutions?.length > 0 && (
                                    <span>• {run.nodeExecutions.length} nodes</span>
                                )}
                            </div>
                        </div>

                        {/* Expanded Tree View */}
                        {expandedRunId === run.id && (
                            <div className="mt-2 ml-2 pl-3 border-l-2 border-white/5 space-y-3 pb-2 animate-in slide-in-from-top-1 duration-200">
                                {(run.nodeExecutions || []).map((node, idx) => (
                                    <div key={idx} className="relative group/node">
                                        {/* Tree Branch Line */}
                                        <div className="absolute -left-[14px] top-2.5 w-3 h-px bg-white/10"></div>
                                        
                                        {/* Node Header Row */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-mono text-white/90">
                                                {node.nodeLabel}
                                            </span>
                                            <StatusIcon status={node.status} />
                                            <span className="text-[10px] text-white/30 font-mono">
                                                {node.duration}
                                            </span>
                                        </div>

                                        {/* Details Block (Error or Output) */}
                                        <div className="pl-0 text-[10px] font-mono space-y-1">
                                            {/* Error Message */}
                                            {node.errorMessage && (
                                                <div className="flex items-start gap-2 text-red-400 bg-red-950/20 p-1.5 rounded border border-red-500/20">
                                                    <span className="shrink-0">└─ Error:</span>
                                                    <span className="break-words leading-tight">{node.errorMessage}</span>
                                                </div>
                                            )}

                                            {/* Output Data */}
                                            {node.outputData && (node.outputData as any).text && (
                                                <div className="flex items-start gap-2 text-white/50">
                                                    <span className="shrink-0 text-white/30">└─ Output:</span>
                                                    <span className="break-words line-clamp-2 italic text-white/60">
                                                        "{(node.outputData as any).text}"
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
}