"use client";

import React, { useMemo } from "react";
import { Handle, Position, NodeProps, useReactFlow, useNodes, useEdges } from "@xyflow/react";
import { Crop, Play, Loader2, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CropNodeType } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { useFlowExecutor } from "@/hooks/useFlowExecutor";

export default function CropImageNode({ id, data, isConnectable, selected }: NodeProps<CropNodeType>) {
    const { updateNodeData } = useWorkflowStore();
    const { runWorkflow } = useFlowExecutor();
    const nodes = useNodes();
    const edges = useEdges();

    // --- SMART STATUS LOGIC ---
    const areInputsReady = useMemo(() => {
        const inputEdges = edges.filter(e => e.target === id);
        
        if (inputEdges.length === 0) return true;

        const inputNodeIds = inputEdges.map(e => e.source);
        const inputNodes = nodes.filter(n => inputNodeIds.includes(n.id));

        return inputNodes.every(n => 
            n.data.status === 'success' || n.data.status === 'idle'
        );
    }, [nodes, edges, id]);

    const isRunning = (data.status === "running" || data.status === "loading") && areInputsReady;
    const isPending = data.status === "pending" || ((data.status === "running" || data.status === "loading") && !areInputsReady);
    const isBusy = isRunning || isPending;

    // --- VISIBILITY LOGIC ---
    const isOutputConnected = useMemo(() => {
        return edges.some(edge => edge.source === id);
    }, [edges, id]);

    const handleRun = () => runWorkflow(id);

    const handleDownload = async () => {
        if (!data.outputUrl) return;
        try {
            const response = await fetch(data.outputUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cropped-image-${Date.now()}.png`;
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
            "rounded-xl border bg-[#1a1a1a] min-w-[280px] max-w-[400px] shadow-xl transition-all relative",
            selected ? "border-[#dfff4f] ring-1 ring-[#dfff4f]/50" : "border-white/10",
            
            // GLOW
            isRunning && "animate-pulse border-[#dfff4f] shadow-[0_0_20px_rgba(223,255,79,0.3)]",
            
            // PENDING
            isPending && "border-yellow-500/50 border-dashed opacity-80"
        )}>
            <div className={cn(
                "flex items-center px-3 py-2.5 border-b border-white/5 rounded-t-xl gap-2 transition-colors",
                isRunning ? "bg-[#dfff4f]/10" : "bg-[#111]"
            )}>
                <Crop size={14} className={isRunning ? "text-[#dfff4f]" : "text-white/70"} />
                <span className="text-xs font-semibold text-white/70">Crop Image</span>
                {isPending && <Clock size={12} className="ml-auto text-yellow-500 animate-pulse" />}
            </div>

            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    {['cropX', 'cropY', 'cropWidth', 'cropHeight'].map((field) => (
                        <div key={field} className="space-y-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold">{field.replace('crop', '')} %</label>
                            <input 
                                type="number" 
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-[#dfff4f]/50 outline-none"
                                value={data[field as keyof typeof data] as number || 0} 
                                onChange={(e) => updateNodeData(id, { [field]: parseInt(e.target.value) || 0 })} 
                            />
                        </div>
                    ))}
                </div>

                {data.outputUrl && (
                    <div className="mt-2 relative group bg-black/20 rounded-lg overflow-hidden border border-white/10">
                        <img src={data.outputUrl} alt="Cropped" className="w-full h-auto max-h-[400px] object-contain block" />
                    </div>
                )}

                <div className="flex gap-2 w-full">
                    {!isOutputConnected && (
                        <button 
                            onClick={handleRun} 
                            disabled={isBusy} 
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
                                isBusy ? "bg-white/10 text-white/50" : "bg-[#dfff4f] text-black hover:bg-white"
                            )}
                        >
                            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                            {isRunning ? "Processing..." : (isPending ? "Waiting..." : "Run Crop")}
                        </button>
                    )}

                    {data.status === 'success' && data.outputUrl && (
                        <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold bg-[#2563eb] text-white hover:bg-[#3b82f6] transition-all">
                            <Download size={12} /> Download
                        </button>
                    )}
                </div>
            </div>

            <Handle type="target" position={Position.Left} id="image-in" isConnectable={isConnectable} className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-blue-500" />
            <Handle type="source" position={Position.Right} id="output" isConnectable={isConnectable} className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-blue-500" />
        </div>
    );
}