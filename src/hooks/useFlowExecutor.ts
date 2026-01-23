"use client";

import { useCallback, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { toast } from "sonner";
import { AppNode } from "@/lib/types";

export function useFlowExecutor() {
    const { nodes, edges, workflowId, loadHistory, updateNodeData } = useWorkflowStore();
    
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    //Is this node "Executable" 
    const isExecutable = (node: AppNode | undefined) => {
        if (!node) return false;
        return !['textNode', 'imageNode', 'videoNode'].includes(node.type || '');
    };

    const executeRun = useCallback(async (scope: 'full' | 'single' | 'partial', targetIds: string[] = []) => {
        if (!workflowId) {
            toast.error("Please save the workflow before running.");
            return;
        }

        if (pollInterval.current) clearInterval(pollInterval.current);

        // 1. STRICT CLIENT VALIDATION
        if (scope === 'single' || scope === 'partial') {
            const selectedNodes = nodes.filter(n => targetIds.includes(n.id));

            // A. Check: Are we trying to run a static input directly?
            const allStatic = selectedNodes.every(n => !isExecutable(n));
            if (allStatic) {
                toast.warning("Cannot execute input node", {
                    description: "Please select a processor node (LLM, Crop, etc) to run.",
                    duration: 4000
                });
                return;
            }

            // B. Check: Did we select the required parents?
            for (const node of selectedNodes) {
                const inputEdges = edges.filter(e => e.target === node.id);
                
                for (const edge of inputEdges) {
                    const parentNode = nodes.find(n => n.id === edge.source);
                    
                    // CASE 1: Parent is an EXECUTABLE Node (LLM, Crop, Extract)
                    // Rule: Must be selected to ensure fresh sequential execution.
                    if (isExecutable(parentNode)) {
                        if (!targetIds.includes(edge.source)) {
                            toast.warning("Dependent Node Not Selected", {
                                description: `The node "${node.data.label}" needs input from "${parentNode?.data.label}". Please select BOTH nodes to run them in order.`,
                                duration: 5000,
                            });
                            return;
                        }
                    }
                    
                    // CASE 2: Parent is a STATIC Node (Video, Image, Text)
                    // Rule: It just needs to have data.
                    else if (parentNode) {
                        const data = parentNode.data as any;
                        const hasData = data.file?.url || data.text || data.image;
                        
                        if (!hasData) {
                            toast.warning("Missing Input Data", {
                                description: `The input node "${data.label}" is empty. Please upload a file or enter text.`,
                                duration: 4000,
                            });
                            return;
                        }
                    }
                }
            }
        }

        // 2. UI FEEDBACK (Waiting Animation)
        if (scope === 'full') {
            nodes.forEach(n => {
                if (isExecutable(n)) updateNodeData(n.id, { status: "pending" });
            });
        } else {
            // Set ALL selected nodes to "Pending" immediately
            targetIds.forEach(id => {
                updateNodeData(id, { status: "pending" });
            });
        }

        try {
            const toastId = toast.loading("Initializing...");

            // --- 3. SERVER CALL ---
            const response = await fetch("/api/workflow/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    workflowId, 
                    nodes, 
                    edges, 
                    targetNodeIds: targetIds.length > 0 ? targetIds : undefined 
                }),
            });

            const res = await response.json();

            if (!res.success) {
                toast.dismiss(toastId);
                throw new Error(res.error || "Failed to start run");
            }

            toast.success("Processing Started", {
                id: toastId,
                description: "Watch the sidebar for progress."
            });

            // --- 4. POLLING ---
            let pollCount = 0;
            pollInterval.current = setInterval(async () => {
                pollCount++;
                await loadHistory(workflowId); 
                
                const history = useWorkflowStore.getState().history;
                if (history.length > 0) {
                    const latestRun = history[0];
                    if (latestRun.id === res.runId && (latestRun.status === 'success' || latestRun.status === 'failed')) {
                        if (pollInterval.current) clearInterval(pollInterval.current);
                    }
                }
                if (pollCount >= 120) { 
                    if (pollInterval.current) clearInterval(pollInterval.current);
                }
            }, 1000); 

        } catch (error: any) {
            console.error("Execution request failed", error);
            toast.error("Request Failed", { description: error.message });
            if (targetIds.length > 0) {
                targetIds.forEach(id => updateNodeData(id, { status: "error" }));
            }
        }
    }, [workflowId, nodes, edges, loadHistory, updateNodeData]);

    return {
        runWorkflow: () => executeRun('full'),
        runSelected: (ids: string[]) => executeRun(ids.length === 1 ? 'single' : 'partial', ids),
        runNode: (nodeId: string) => executeRun('single', [nodeId])
    };
}