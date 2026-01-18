"use client";

import React from "react";
import { Play, Layers, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunControlsProps {
    selectedCount: number;
    onRunAll: () => void;
    onRunSelected: () => void;
    isRunning?: boolean;
}

export default function RunControls({ selectedCount, onRunAll, onRunSelected, isRunning = false }: RunControlsProps) {
    return (
        <div className="flex items-center gap-2 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Run Selected Button (Dynamic) */}
            {selectedCount > 0 ? (
                <>
                    <button
                        onClick={onRunSelected}
                        disabled={isRunning}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            "bg-white/10 hover:bg-white/20 text-white border border-white/5",
                            isRunning && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {selectedCount === 1 ? <MousePointer2 size={12} className="text-[#dfff4f]" /> : <Layers size={12} className="text-[#dfff4f]" />}
                        Run {selectedCount === 1 ? "Node" : "Selected"} ({selectedCount})
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                </>
            ) : null}

            {/* Run Full Workflow Button */}
            <button
                onClick={onRunAll}
                disabled={isRunning}
                className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    "bg-[#dfff4f] text-black hover:bg-[#ebff70] hover:shadow-[0_0_15px_-3px_rgba(223,255,79,0.3)]",
                    isRunning && "bg-white/10 text-white/50 cursor-not-allowed shadow-none"
                )}
            >
                <Play size={12} fill="currentColor" />
                {isRunning ? "Running..." : "Run Workflow"}
            </button>
        </div>
    );
}