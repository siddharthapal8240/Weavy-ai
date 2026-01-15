"use client";

import React, { useMemo } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Film, Play, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExtractNodeType } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { useFlowExecutor } from "@/hooks/useFlowExecutor";

export default function ExtractFrameNode({ id, data, isConnectable, selected }: NodeProps<ExtractNodeType>) {
    const { updateNodeData } = useWorkflowStore();
    const { getEdges } = useReactFlow();
    const { runWorkflow } = useFlowExecutor();

    // --- VISIBILITY LOGIC ---
    const isOutputConnected = useMemo(() => {
        const edges = getEdges();
        return edges.some(edge => edge.source === id);
    }, [getEdges, id]);

    const handleRun = () => runWorkflow(id);

    const handleDownload = async () => {
        if (!data.outputUrl) return;
        try {
            const response = await fetch(data.outputUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracted-frame-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            window.open(data.outputUrl, '_blank');
        }
    };

    return (
        <div className={cn(
            "rounded-xl border bg-[#1a1a1a] min-w-[280px] shadow-xl transition-all relative",
            selected ? "border-[#dfff4f] ring-1 ring-[#dfff4f]/50" : "border-white/10",
            data.status === 'loading' && "animate-pulse border-[#dfff4f] shadow-[0_0_20px_rgba(223,255,79,0.3)]"
        )}>
            <div className="flex items-center px-3 py-2.5 border-b border-white/5 bg-[#111] rounded-t-xl gap-2">
                <Film size={14} className="text-[#dfff4f]" />
                <span className="text-xs font-semibold text-white/70">Extract Frame</span>
            </div>

            <div className="p-4 space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase font-bold">Timestamp (Seconds or %)</label>
                    <input 
                        type="text"
                        placeholder='e.g. 5 or 50%'
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-[#dfff4f]/50 outline-none"
                        value={data.timestamp || ""}
                        onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
                    />
                </div>

                {data.outputUrl && (
                    <div className="mt-2 relative group bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                        <img src={data.outputUrl} alt="Frame" className="w-full h-auto max-h-48 object-contain block mx-auto" />
                    </div>
                )}

                <div className="flex gap-2 w-full">
                    {/* HIDE Run Button if Connected */}
                    {!isOutputConnected && (
                        <button 
                            onClick={handleRun} 
                            disabled={data.status === 'loading'} 
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
                                data.status === 'loading' ? "bg-white/10 text-white/50" : "bg-[#dfff4f] text-black hover:bg-white"
                            )}
                        >
                            {data.status === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                            {data.status === 'loading' ? "Processing..." : "Extract Frame"}
                        </button>
                    )}

                    {data.status === 'success' && data.outputUrl && (
                        <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold bg-[#2563eb] text-white hover:bg-[#3b82f6] transition-all">
                            <Download size={12} /> Download
                        </button>
                    )}
                </div>
            </div>

            <Handle type="target" position={Position.Left} id="video-in" isConnectable={isConnectable} className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-cyan-500" />
            <Handle type="source" position={Position.Right} id="output" isConnectable={isConnectable} className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-blue-500" />
        </div>
    );
}