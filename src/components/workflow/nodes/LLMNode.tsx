"use client";

import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  Handle,
  Position,
  NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
  useNodes,
  useEdges,
} from "@xyflow/react";
import {
  Bot,
  Plus,
  Loader2,
  MoreHorizontal,
  Settings2,
  Copy,
  Check,
  X,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LLMNodeData, LLMNodeType } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { useFlowExecutor } from "@/hooks/useFlowExecutor";

export default function LLMNode({
  id,
  data,
  isConnectable,
  selected,
}: NodeProps<LLMNodeType>) {
  const { updateNodeData, deleteNode } = useWorkflowStore();
  const { runWorkflow } = useFlowExecutor();
  
  // Standard hook call
  const updateNodeInternals = useUpdateNodeInternals();
  const { setEdges } = useReactFlow();

  // Reactive state
  const nodes = useNodes();
  const edges = useEdges();

  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const imageHandleCount = data.imageHandleCount ?? 1;

  // --- SMART STATUS LOGIC ---
  const areInputsReady = useMemo(() => {
    const inputEdges = edges.filter((e) => e.target === id);
    if (inputEdges.length === 0) return true;

    const inputNodeIds = inputEdges.map((e) => e.source);
    const inputNodes = nodes.filter((n) => inputNodeIds.includes(n.id));

    return inputNodes.every(
      (n) => n.data.status === "success" || n.data.status === "idle"
    );
  }, [nodes, edges, id]);

  const isRunning =
    (data.status === "running" || data.status === "loading") && areInputsReady;

  const isPending =
    data.status === "pending" ||
    ((data.status === "running" || data.status === "loading") &&
      !areInputsReady);

  const isBusy = isRunning || isPending;

  // --- VISIBILITY LOGIC ---
  const isOutputConnected = useMemo(() => {
    return edges.some((edge) => edge.source === id);
  }, [edges, id]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageHandleCount, updateNodeInternals]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value as LLMNodeData["model"] });
    },
    [id, updateNodeData]
  );

  const handleCopy = useCallback(async () => {
    const responseText =
      typeof data.response === "string" ? data.response : null;

    if (data.outputs && data.outputs.length > 0) {
      const textToCopy = data.outputs[data.outputs.length - 1].content;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (responseText) {
      await navigator.clipboard.writeText(responseText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data.outputs, data.response]);

  const handleAddImageInput = useCallback(() => {
    updateNodeData(id, { imageHandleCount: imageHandleCount + 1 });
  }, [id, imageHandleCount, updateNodeData]);

  const handleRemoveImageInput = useCallback(
    (index: number) => {
      if (imageHandleCount <= 1) return;
      setEdges((edges) =>
        edges.filter((edge) => {
          if (edge.target !== id) return true;
          if (!edge.targetHandle?.startsWith("image")) return true;
          const handleIndex = parseInt(edge.targetHandle.split("-")[1]);
          return handleIndex < imageHandleCount - 1;
        })
      );
      updateNodeData(id, { imageHandleCount: imageHandleCount - 1 });
    },
    [imageHandleCount, id, updateNodeData, setEdges]
  );

  const handleRun = useCallback(() => {
    runWorkflow(id);
  }, [id, runWorkflow]);

  const getDisplayText = (): string | null => {
    if (typeof data.response === "string") return data.response;
    if (
      data.outputs &&
      Array.isArray(data.outputs) &&
      data.outputs.length > 0
    ) {
      return data.outputs[data.outputs.length - 1].content;
    }
    return null;
  };

  const displayText = getDisplayText();

  return (
    <div
      className={cn(
        "rounded-xl border bg-[#1a1a1a] min-w-[320px] max-w-[400px] shadow-2xl transition-all duration-200 flex flex-col max-h-[600px] relative",
        selected
          ? "border-[#dfff4f] ring-1 ring-[#dfff4f]/50"
          : "border-white/10 hover:border-white/30",
        data.status === "error" && "border-red-500 ring-1 ring-red-500/50",
        isRunning &&
          "animate-pulse border-[#dfff4f] shadow-[0_0_20px_rgba(223,255,79,0.3)]",
        isPending && "border-yellow-500/30 border-dashed"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 border-b border-white/5 rounded-t-xl transition-colors",
          isRunning ? "bg-[#dfff4f]/10" : "bg-[#111]"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            {data.model || "gemini-2.5-flash"}
          </span>
          {isPending && (
            <Clock size={12} className="text-yellow-500 animate-pulse ml-2" />
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "p-1 rounded transition-colors",
              showMenu
                ? "bg-white/10 text-white"
                : "hover:bg-white/5 text-white/50"
            )}
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 w-32 bg-[#222] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(id);
                }}
                className="w-full text-left px-3 py-2 text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors font-medium"
              >
                <Trash2 size={10} />
                Delete Node
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-3">
        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-white/50 uppercase font-semibold flex items-center gap-1.5">
            <Settings2 size={10} /> Model Configuration
          </label>
          <select
            value={data.model}
            onChange={onModelChange}
            className="w-full bg-[#0a0a0a] text-xs text-white rounded-lg border border-white/10 p-2 focus:outline-none focus:border-[#dfff4f]/50 cursor-pointer"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">
              Gemini 1.5 Pro (High Intelligence)
            </option>
          </select>
        </div>

        {/* Output Display */}
        <div className="bg-[#2a2a2a] rounded-lg border border-white/10 flex flex-col">
          {data.status === "success" && displayText && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-white/40 uppercase font-semibold">
                Output
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/60 hover:text-white/90 hover:bg-white/5 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={11} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={11} /> Copy
                  </>
                )}
              </button>
            </div>
          )}
          <div
            className="p-3 overflow-y-auto custom-scrollbar"
            style={{ height: "180px", maxHeight: "180px" }}
          >
            {isBusy ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2 size={20} className="animate-spin text-white/30" />
                {isPending && (
                  <span className="text-[10px] text-white/30 animate-pulse">
                    Waiting for inputs...
                  </span>
                )}
              </div>
            ) : data.status === "success" && displayText ? (
              <div className="w-full text-xs text-white/80 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {displayText}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-white/30">
                  The generated text will appear here
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 mb-6 pb-3 flex items-center justify-between gap-2">
        <button
          onClick={handleAddImageInput}
          className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80 transition-colors font-medium"
        >
          <Plus size={12} />
          Add another image input
        </button>

        {!isOutputConnected && (
          <button
            onClick={handleRun}
            disabled={isBusy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
              isBusy
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/90 text-black hover:bg-white active:scale-95"
            )}
          >
            {isBusy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <>
                <Bot size={12} /> Run Model
              </>
            )}
          </button>
        )}
      </div>

      {/* Handles */}
      <div className="absolute -left-2" style={{ top: "30%" }}>
        <Handle
          type="target"
          position={Position.Left}
          id="system-prompt"
          isConnectable={isConnectable}
          onMouseEnter={() => setHoveredHandle("system-prompt")}
          onMouseLeave={() => setHoveredHandle(null)}
          className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-[#15803d] hover:!bg-[#15803d] transition-colors"
        />
        {hoveredHandle === "system-prompt" && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/90 text-[#15803d] text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none border border-[#15803d]/20">
            System Prompt
          </div>
        )}
      </div>

      <div className="absolute -left-2" style={{ top: "45%" }}>
        <Handle
          type="target"
          position={Position.Left}
          id="prompt"
          isConnectable={isConnectable}
          onMouseEnter={() => setHoveredHandle("prompt")}
          onMouseLeave={() => setHoveredHandle(null)}
          className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-[#d97706] hover:!bg-[#d97706] transition-colors"
        />
        {hoveredHandle === "prompt" && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/90 text-[#d97706] text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none border border-[#d97706]/20">
            Prompt
          </div>
        )}
      </div>

      {Array.from({ length: imageHandleCount }).map((_, index) => {
        const topPosition = 60 + index * 10;
        return (
          <div
            key={`image-${index}`}
            className="absolute -left-2 flex items-center"
            style={{ top: `${topPosition}%` }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`image-${index}`}
              isConnectable={isConnectable}
              onMouseEnter={() => setHoveredHandle(`image-${index}`)}
              onMouseLeave={() => setHoveredHandle(null)}
              className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-[#2563eb] hover:!bg-[#2563eb] transition-colors"
            />
            {hoveredHandle === `image-${index}` && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/90 text-[#2563eb] text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none flex items-center gap-2 border border-[#2563eb]/20">
                Image {index + 1}
                {imageHandleCount > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImageInput(index);
                    }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute -right-2 top-1/2 -translate-y-1/2">
        <Handle
          type="source"
          position={Position.Right}
          id="response"
          isConnectable={isConnectable}
          onMouseEnter={() => setHoveredHandle("response")}
          onMouseLeave={() => setHoveredHandle(null)}
          className="!w-3.5 !h-3.5 !bg-[#1a1a1a] !border-[3px] !border-[#dfff4f] hover:!bg-[#dfff4f] transition-colors"
        />
        {hoveredHandle === "response" && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/90 text-[#dfff4f] text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none border border-[#dfff4f]/20">
            Response Output
          </div>
        )}
      </div>
    </div>
  );
}