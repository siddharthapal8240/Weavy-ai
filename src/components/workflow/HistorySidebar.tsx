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
    X,
    AlertCircle 
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

    // Friendly Error Logic
    const getFriendlyErrorMessage = (run: any) => {
        // 1. Check if a specific node failed
        const failedNode = run.nodeExecutions?.find((n: any) => 
            n.status?.toLowerCase() === 'failed'
        );
        
        if (failedNode) {
            return (
                <span>
                    The <span className="font-bold text-red-300">{failedNode.nodeLabel}</span> node encountered an error.
                    <br/>
                    <span className="opacity-70">Please check your inputs and try again.</span>
                </span>
            );
        }

        // 2. Fallback to system error
        const systemError = run.errorMessage || run.error;
        if (systemError && systemError !== "Unknown system error occurred") {
             return (
                <span>
                    {systemError}
                    <br/>
                    <span className="opacity-70">Please review the workflow configuration.</span>
                </span>
            );
        }

        // 3. Generic Fallback
        return (
            <span>
                The <span className="font-bold text-red-300">Gemini / LLM Node</span> failed to process.
                <br/>
                <span className="opacity-70">This usually happens due to connection issues or invalid prompts. Please try again.</span>
            </span>
        );
    };

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

                            {/* Bottom Row: Duration Only (Chain Removed) */}
                            <div className="pl-6 flex items-center gap-3 text-[10px] text-white/40 font-medium">
                                {/* REMOVED THE TRIGGER TYPE BADGE HERE */}
                                <span>{run.duration}</span>
                                {run.nodeExecutions?.length > 0 && (
                                    <span>• {run.nodeExecutions.length} nodes</span>
                                )}
                            </div>
                        </div>

                        {/* Expanded Tree View */}
                        {expandedRunId === run.id && (
                            <div className="mt-2 ml-2 pl-3 border-l-2 border-white/5 space-y-3 pb-2 animate-in slide-in-from-top-1 duration-200">
                                
                                {/* ERROR BOX (User Friendly) */}
                                {run.status === 'failed' && (
                                    <div className="relative group/error mb-3 mr-2">
                                        <div className="absolute -left-[14px] top-2.5 w-3 h-px bg-red-500/30"></div>
                                        <div className="flex flex-col gap-1 p-2.5 bg-red-950/30 border border-red-500/20 rounded-md">
                                            <div className="flex items-center gap-2 text-red-400 mb-0.5">
                                                <AlertCircle size={13} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Workflow Failed</span>
                                            </div>
                                            <div className="text-[11px] text-red-200/90 leading-relaxed font-medium">
                                                {getFriendlyErrorMessage(run)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Node List */}
                                {(run.nodeExecutions || []).map((node, idx) => (
                                    <div key={idx} className="relative group/node">
                                        <div className="absolute -left-[14px] top-2.5 w-3 h-px bg-white/10"></div>
                                        
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-mono text-white/90">
                                                {node.nodeLabel}
                                            </span>
                                            <StatusIcon status={node.status} />
                                            <span className="text-[10px] text-white/30 font-mono">
                                                {node.duration}
                                            </span>
                                        </div>

                                        <div className="pl-0 text-[10px] font-mono space-y-1">
                                            {node.errorMessage && (
                                                <div className="flex items-start gap-2 text-red-400 bg-red-950/20 p-1.5 rounded border border-red-500/20 opacity-80">
                                                    <span className="shrink-0">└─ Log:</span>
                                                    <span className="break-words leading-tight">{node.errorMessage}</span>
                                                </div>
                                            )}

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