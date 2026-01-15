"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Type,
  ImageIcon,
  Sparkles,
  Folder,
  Trash2,
  Zap,
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileVideo,
  Crop,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserWorkflowsAction } from "@/app/actions/workflowActions";
import type { Workflow, AppNode } from "@/lib/types"; // Ensure AppNode is imported
import { useWorkflowStore } from "@/store/workflowStore";

interface SidebarNodeListProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

const AVAILABLE_NODES = [
  { type: "textNode", label: "Text Node", icon: Type },
  { type: "imageNode", label: "Image Node", icon: ImageIcon },
  { type: "videoNode", label: "Video Node", icon: FileVideo },
  { type: "llmNode", label: "Run Any LLM Node", icon: Sparkles },
  { type: "cropNode", label: "Crop Image", icon: Crop },
  { type: "extractNode", label: "Extract Frame", icon: Film },
];

const SidebarNodeList = ({
  isCollapsed,
  setIsCollapsed,
}: SidebarNodeListProps) => {
  // 1. Get addNode from store
  const { workflowName, setWorkflowName, addNode } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<"search" | "quick-access" | "workflows">("quick-access");
  const [searchQuery, setSearchQuery] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoadingWorkflows(true);
      try {
        const res = await getUserWorkflowsAction();
        if (res.success) {
          setWorkflows(res.workflows);
        }
      } catch (error) {
        console.error("Failed to fetch workflows", error);
      } finally {
        setLoadingWorkflows(false);
      }
    };
    fetchWorkflows();
  }, []);

  const handleTabClick = (tab: "search" | "quick-access" | "workflows") => {
    if (!setIsCollapsed) return;
    if (activeTab === tab) {
      setIsCollapsed(!isCollapsed);
    } else {
      setActiveTab(tab);
      setIsCollapsed(false);
    }
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // 2. Logic to add node on click (Replicates the data structure from your FlowEditor)
  const handleNodeClick = (type: string) => {
    const newNodeId = crypto.randomUUID();
    
    // Add a small random offset so if they click multiple times they don't stack perfectly
    const randomOffset = Math.random() * 50;
    const position = { x: 100 + randomOffset, y: 20 + randomOffset };

    let newNode: AppNode;

    if (type === "textNode") {
        newNode = { 
            id: newNodeId, 
            type: "textNode", 
            position, 
            data: {label: "Text Input", text: "", status: "idle"} 
        };
    } else if (type === "imageNode") {
        newNode = { 
            id: newNodeId, 
            type: "imageNode", 
            position, 
            data: {label: "Image Input", status: "idle", inputType: "upload"} 
        };
    } else if (type === "videoNode") {
        newNode = { 
            id: newNodeId, 
            type: "videoNode", 
            position, 
            data: { label: "Video Input", status: "idle" } 
        };
    } else if (type === "cropNode") {
        newNode = { 
            id: newNodeId, 
            type: "cropNode", 
            position, 
            data: { label: "Crop Image", status: "idle", cropX: 0, cropY: 0, cropWidth: 100, cropHeight: 100 } 
        };
    } else if (type === "extractNode") {
        newNode = { 
            id: newNodeId, 
            type: "extractNode", 
            position, 
            data: { label: "Extract Frame", status: "idle", timestamp: 0 } 
        };
    } else {
        // LLM Node
        newNode = { 
            id: newNodeId, 
            type: "llmNode", 
            position, 
            data: { 
                label: "LLM Node", 
                status: "idle", 
                model: "gemini-2.5-flash", 
                temperature: 0.7, 
                viewMode: "single", 
                outputs: [], 
                imageHandleCount: 1 
            } 
        };
    }
    
    // Push to store
    addNode(newNode);
  };

  const filteredNodes = AVAILABLE_NODES.filter((node) =>
    node.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex w-full h-full bg-[#09090b]">
      {/* --- LEFT RAIL --- */}
      <div className={cn(
        "flex flex-col items-center py-4 gap-3 shrink-0 z-20 bg-[#09090b] transition-all duration-300 ease-in-out",
        "w-[50px] md:w-[60px]",
        "border-none"
      )}>
        <span className="w-9 h-9 flex items-center justify-center rounded-lg mb-2">
          <Link href="/workflows">
            <Image src="/weavy.svg" alt="Weavy" width={32} height={32} className="object-contain" />
          </Link>
        </span>

        <NavButton active={activeTab === "search" && !isCollapsed} onClick={() => handleTabClick("search")} icon={<Search size={18} />} />
        <NavButton active={activeTab === "quick-access" && !isCollapsed} onClick={() => handleTabClick("quick-access")} icon={<Zap size={18} fill={activeTab === "quick-access" && !isCollapsed ? "currentColor" : "none"} />} />
        <NavButton active={activeTab === "workflows" && !isCollapsed} onClick={() => handleTabClick("workflows")} icon={<Folder size={18} />} />

        <div className="mt-auto flex flex-col gap-4 items-center mb-2">
          <button className="text-white/30 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-lg">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* --- RIGHT PANEL --- */}
      {!isCollapsed && (
        <div className="flex-1 bg-[#111111] flex flex-col overflow-hidden animate-in fade-in duration-300 slide-in-from-left-2">
          
          {/* UNIVERSAL HEADER WITH BACK ARROW */}
          <div className="px-5 pt-5 pb-2 shrink-0">
            <div className="flex items-center gap-2 mb-2">
               <Link 
                 href="/workflows" 
                 className="p-1 hover:bg-white/5 rounded-md text-white/40 hover:text-white transition-all"
                 title="Back to Workflows"
               >
                 <ArrowLeft size={16} />
               </Link>
               <input
                 type="text"
                 value={workflowName || ""}
                 onChange={(e) => setWorkflowName(e.target.value)}
                 placeholder="Untitled Workflow"
                 className="flex-1 bg-transparent text-sm font-semibold text-white focus:outline-none placeholder:text-white/30 truncate"
               />
            </div>
            <div className="h-px w-full bg-white/5 mt-2"></div>
          </div>

          {activeTab === "search" && (
            <div className="flex flex-col h-full">
              <div className="px-5 py-3 pb-2">
                <h2 className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-3">Search Nodes</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                  <input type="text" autoFocus placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-white/30 placeholder:text-white/20 transition-all" />
                </div>
              </div>
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {filteredNodes.length > 0 ? filteredNodes.map((node) => (
                    <div 
                        key={node.type} 
                        draggable 
                        onDragStart={(e) => onDragStart(e, node.type)} 
                        onClick={() => handleNodeClick(node.type)} // Added Click Handler
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-[#161616] hover:bg-[#1a1a1a] hover:border-white/20 cursor-pointer active:scale-95 transition-all group"
                    >
                      <node.icon size={16} className="text-white/60 group-hover:text-white" />
                      <span className="text-xs font-medium text-white/80 group-hover:text-white">{node.label}</span>
                    </div>
                  )) : <p className="text-white/30 text-[10px] text-center mt-4">No nodes found.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === "quick-access" && (
            <div className="flex flex-col h-full p-5 pt-3">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <h3 className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-4">Quick access</h3>
                <div className="grid grid-cols-2 gap-3">
                  <NodeCard icon={Type} label="Text" onDragStart={(e) => onDragStart(e, "textNode")} onClick={() => handleNodeClick("textNode")} />
                  <NodeCard icon={ImageIcon} label="Image" onDragStart={(e) => onDragStart(e, "imageNode")} onClick={() => handleNodeClick("imageNode")} />
                  <NodeCard icon={Sparkles} label="LLM" onDragStart={(e) => onDragStart(e, "llmNode")} onClick={() => handleNodeClick("llmNode")} />
                  <NodeCard icon={FileVideo} label="Video" onDragStart={(e) => onDragStart(e, "videoNode")} onClick={() => handleNodeClick("videoNode")} />
                  <NodeCard icon={Crop} label="Crop" onDragStart={(e) => onDragStart(e, "cropNode")} onClick={() => handleNodeClick("cropNode")} />
                  <NodeCard icon={Film} label="Frame" onDragStart={(e) => onDragStart(e, "extractNode")} onClick={() => handleNodeClick("extractNode")} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "workflows" && (
            <div className="flex flex-col h-full p-5 pt-3">
              <h2 className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-4">Your Workflows</h2>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {loadingWorkflows && (
                  <div className="flex items-center justify-center py-8 text-white/30">
                    <Loader2 className="animate-spin" size={20} />
                  </div>
                )}
                {!loadingWorkflows && workflows.length === 0 && (
                  <div className="text-center py-8 text-white/30 text-[10px]">No workflows found.</div>
                )}
                {!loadingWorkflows && workflows.map((wf) => (
                  <Link
                    key={wf.id}
                    href={`/workflows/${wf.id}`}
                    className="group flex items-center justify-between p-3 border border-white/10 bg-[#161616] rounded-lg hover:bg-[#1a1a1a] hover:border-white/20 cursor-pointer transition-all"
                  >
                    <div className="overflow-hidden">
                      <div className="font-medium text-xs text-white truncate group-hover:text-[#ebffba] transition-colors pr-2">
                        {wf.name}
                      </div>
                      <div className="text-[10px] text-white/30 mt-0.5">
                        {new Date(wf.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-white/20 group-hover:text-white transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---
function NavButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200", active ? "bg-[#ebffba] text-black shadow-[0_0_10px_-3px_rgba(235,255,186,0.3)] scale-105" : "text-white/40 hover:text-white hover:bg-white/5")}>
      {icon}
    </button>
  );
}

// Updated NodeCard to accept onClick
function NodeCard({ icon: Icon, label, onDragStart, onClick }: { icon: any; label: string; onDragStart: (e: React.DragEvent) => void; onClick: () => void }) {
  return (
    <div 
        draggable 
        onDragStart={onDragStart}
        onClick={onClick}
        className="aspect-square border border-white/10 rounded-xl bg-[#161616] hover:bg-[#1f1f1f] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-white/25 hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all group"
    >
      <Icon size={24} className="text-white/50 group-hover:text-white transition-colors duration-300" />
      <span className="text-[10px] text-center text-white/60 font-medium px-2 group-hover:text-white transition-colors duration-300">{label}</span>
    </div>
  );
}

export default SidebarNodeList;