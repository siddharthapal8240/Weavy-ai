"use client";

import React, { useState, useCallback } from "react";
import { 
    ChevronRight, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    DownloadCloudIcon, 
    UploadCloud 
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { saveWorkflowAction } from "@/app/actions/workflowActions";

export default function Header() {
    const { 
        nodes, 
        edges, 
        workflowId, 
        workflowName, 
        setWorkflowName, 
        saveStatus, 
        setWorkflowId, 
        setSaveStatus,
        toggleHistory 
    } = useWorkflowStore();
    
    const [isEditingName, setIsEditingName] = useState(false);

    // --- HANDLE IMPORT (MERGE) ---
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsedData = JSON.parse(content);

                // Basic validation
                if (!Array.isArray(parsedData.nodes) || !Array.isArray(parsedData.edges)) {
                    alert("Invalid workflow file: Missing nodes or edges.");
                    return;
                }

                // 1. Create a map to link Old IDs -> New IDs (prevents conflicts)
                const idMap = new Map<string, string>();

                // 2. Process Nodes: Generate new ID + Offset position
                const newNodes = parsedData.nodes.map((node: any) => {
                    const newId = crypto.randomUUID();
                    idMap.set(node.id, newId); // Map old ID to new ID
                    
                    return {
                        ...node,
                        id: newId,
                        position: {
                            x: (node.position?.x || 0) + 50,
                            y: (node.position?.y || 0) + 50
                        },
                        data: { ...node.data, status: 'idle' } 
                    };
                });

                // 3. Process Edges: Update source/target to match new IDs
                const newEdges = parsedData.edges.map((edge: any) => {
                    const newId = crypto.randomUUID();
                    return {
                        ...edge,
                        id: newId,
                        source: idMap.get(edge.source) || edge.source,
                        target: idMap.get(edge.target) || edge.target,
                    };
                });

                // 4. MERGE with existing state (Append instead of Replace)
                useWorkflowStore.setState({
                    nodes: [...nodes, ...newNodes],
                    edges: [...edges, ...newEdges],
                });

                // Reset input
                event.target.value = ""; 
                
                // Visual feedback
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 2000);

            } catch (error) {
                console.error("Failed to parse workflow file:", error);
                alert("Failed to import workflow. Please check the file format.");
            }
        };
        reader.readAsText(file);
    };

    // --- HANDLE SAVE ---
    const handleSave = async () => {
        if (nodes.length === 0) return;
        setSaveStatus('saving');
        try {
            const result = await saveWorkflowAction({
                id: workflowId,
                name: workflowName,
                nodes,
                edges,
            });
            if (result.success && result.id) {
                setWorkflowId(result.id);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error(error);
            setSaveStatus('error');
        }
    };

    // --- HANDLE SHARE (EXPORT) ---
    const handleShare = useCallback(() => {
        const workflowData = { name: workflowName, nodes, edges, version: "1.0.0" };
        const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${workflowName.replace(/\s+/g, "_").toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [nodes, edges, workflowName]);

    // Helper for the save status indicator
    const SaveStatusIndicator = () => {
        if (saveStatus === 'idle') return null;

        return (
            <div className="flex items-center animate-in fade-in zoom-in duration-300 ml-auto">
                {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-white/50" />}
                {saveStatus === 'saved' && <CheckCircle2 size={12} className="text-green-500/70" />}
                {saveStatus === 'error' && <AlertCircle size={12} className="text-red-500/70" />}
            </div>
        );
    };

    return (
        <header className="absolute top-0 left-0 w-full z-10 flex items-start justify-between p-4 pointer-events-none">
            
            {/* --- LEFT: FLOATING NAME INPUT --- */}
            <div className="pointer-events-auto ml-[80px] mt-2 z-10">
                <div className="flex items-center">
                    {isEditingName ? (
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            onBlur={() => { setIsEditingName(false); handleSave(); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { setIsEditingName(false); handleSave(); }}}
                            autoFocus
                            className="bg-[#1a1a1a] text-base font-medium text-white px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 max-w-[120px] md:max-w-[300px] min-w-[100px]"
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditingName(true)}
                            className="bg-[#1a1a1a] hover:bg-[#222] text-base font-semibold font-medium text-white px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all text-left max-w-[120px] md:max-w-[300px] truncate shadow-sm"
                        >
                            {workflowName || "Untitled Workflow"}
                        </button>
                    )}
                </div>
            </div>

            {/* --- RIGHT: UNIFIED CONTROL BOX --- */}
            <div className="pointer-events-auto z-10">
                <div className="flex flex-col bg-[#212126] border border-white/10 rounded-xl p-3 shadow-2xl min-w-[210px] gap-3">
                    
                    {/* Top Row: Import | Export */}
                    <div className="flex items-center gap-2">
                        {/* IMPORT BUTTON */}
                        <button
                            onClick={() => document.getElementById('workflow-import')?.click()}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 bg-[#e3e7d3] text-black text-xs font-bold rounded-md hover:bg-white transition-colors"
                        >
                            <UploadCloud size={13} strokeWidth={2.5} />
                            Import
                            {/* Hidden Input for handling file upload */}
                            <input 
                                id="workflow-import" 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                onChange={handleImport} 
                            />
                        </button>

                        {/* EXPORT BUTTON */}
                        <button
                            onClick={handleShare}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 bg-[#e3e7d3] text-black text-xs font-bold rounded-md hover:bg-white transition-colors"
                        >
                            <DownloadCloudIcon size={13} strokeWidth={2.5} />
                            Export
                        </button>
                    </div>

                    {/* Bottom Row: History (Toggle) + Save Status */}
                    <div className="flex items-center pl-1 justify-between">
                         <button 
                            onClick={toggleHistory}
                            className="flex items-center gap-1 text-sm font-medium text-white hover:text-white/80 transition-colors group"
                        >
                            History 
                            <ChevronRight size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        
                        <SaveStatusIndicator />
                    </div>
                </div>
            </div>
        </header>
    );
}