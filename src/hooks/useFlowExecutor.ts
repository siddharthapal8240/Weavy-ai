"use client";

import { useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { startWorkflowRunAction, finishWorkflowRunAction } from "@/app/actions/historyActions";
import { WorkflowRun, NodeExecutionResult } from "@/lib/types";
import { toast } from "sonner"; 

export function useFlowExecutor() {
    const { nodes, edges, updateNodeData, workflowId, addHistoryEntry, updateHistoryEntry, addNodeToHistoryRun } = useWorkflowStore();
    
    const executionPromises = useRef<Map<string, Promise<string | null>>>(new Map());

    // 1. Core Recursive Execution Logic
    const executeNode = useCallback(async (nodeId: string, runId: string, allowedNodes: Set<string> | null): Promise<string | null> => {
        if (executionPromises.current.has(nodeId)) {
            return executionPromises.current.get(nodeId)!;
        }

        const nodePromise = (async () => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) throw new Error(`Node not found`);

            // --- 1. RESOLVE DEPENDENCIES FIRST ---
            const upstreamEdges = edges.filter((e) => e.target === nodeId);
            const upstreamResults = await Promise.all(
                upstreamEdges.map(async (edge) => {
                    const result = await executeNode(edge.source, runId, allowedNodes);
                    return { handle: edge.targetHandle, value: result };
                })
            );

            // --- 2. CHECK IF EXECUTION IS ALLOWED---
            const shouldExecute = allowedNodes === null || allowedNodes.has(nodeId);

            if (!shouldExecute) {
                if (node.type === "textNode") return (node.data as any).text;
                if (node.type === "videoNode" || node.type === "imageNode") return (node.data as any).file?.url;
                if (node.data.outputUrl) return node.data.outputUrl;
                if (node.data.response) return node.data.response;
                return null;
            }

            // --- 3. BASE CASES ---
            if (node.type === "videoNode" || node.type === "imageNode") {
                const url = (node.data as any).file?.url;
                if (!url) throw new Error("Input file is missing");
                return url;
            }
            if (node.type === "textNode") {
                return (node.data as any).text || "";
            }

            // --- 4. START PROCESSING ---
            updateNodeData(nodeId, { status: "loading", errorMessage: undefined });
            const startTime = Date.now();
            let resultUrl: string | null = null;
            let inputDataLog: any = {};
            let outputDataLog: any = {};

            try {
                if (node.type === "extractNode") {
                    const source = upstreamResults.find(r => r.handle === "video-in")?.value;
                    if (!source) throw new Error("Waiting for video input...");

                    const response = await fetch("/api/media/process", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            type: "extract",
                            inputUrl: source,
                            params: { timestamp: node.data.timestamp || 0 }
                        }),
                    });
                    const res = await response.json();
                    if (!res.success) throw new Error(res.error || "Frame extraction failed");
                    resultUrl = res.url;
                    inputDataLog = { timestamp: node.data.timestamp, source };
                    outputDataLog = { url: resultUrl };
                }
                else if (node.type === "cropNode") {
                    const source = upstreamResults.find(r => r.handle === "image-in")?.value;
                    if (!source) throw new Error("Waiting for image input...");

                    const response = await fetch("/api/media/process", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            type: "crop",
                            inputUrl: source,
                            params: {
                                x: node.data.cropX || 0,
                                y: node.data.cropY || 0,
                                width: node.data.cropWidth || 100,
                                height: node.data.cropHeight || 100,
                            }
                        }),
                    });
                    const res = await response.json();
                    if (!res.success) throw new Error(res.error || "Crop failed");
                    resultUrl = res.url;
                    inputDataLog = { source, params: node.data };
                    outputDataLog = { url: resultUrl };
                }
                else if (node.type === "llmNode") {
                    let systemPrompt = node.data.systemPrompt || "";
                    let userPrompt = node.data.userPrompt || "";
                    const images: string[] = [];

                    upstreamResults.forEach(({ handle, value }) => {
                        if (!value) return;
                        if (handle === "system-prompt") systemPrompt = value;
                        else if (handle === "prompt") userPrompt = value;
                        else if (handle?.startsWith("image")) images.push(value);
                    });

                    const response = await fetch("/api/llm/process", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            system: systemPrompt,
                            prompt: userPrompt || "Analyze this image",
                            images,
                            model: node.data.model
                        }),
                    });
                    const res = await response.json();
                    if (!res.success) throw new Error(res.error || "AI generation failed");
                    resultUrl = res.text;
                    outputDataLog = { text: res.text };
                    updateNodeData(nodeId, { response: res.text });
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                updateNodeData(nodeId, { status: "success", outputUrl: resultUrl });

                if (workflowId && runId) {
                    const nodeExecution: NodeExecutionResult = {
                        nodeId,
                        nodeLabel: node.data.label || node.type,
                        status: "success",
                        duration,
                        inputData: inputDataLog,
                        outputData: outputDataLog
                    };
                    await finishWorkflowRunAction(runId, "running", duration, [nodeExecution]);
                    addNodeToHistoryRun(runId, nodeExecution);
                }

                return resultUrl;

            } catch (error: any) {
                updateNodeData(nodeId, { status: "error", errorMessage: error.message });
                throw error;
            }
        })();

        executionPromises.current.set(nodeId, nodePromise);
        return nodePromise;
    }, [nodes, edges, updateNodeData, workflowId, addNodeToHistoryRun]);


    // 2. Main Execution Handler
    const executeRun = useCallback(async (scope: 'full' | 'partial' | 'single', targetNodeIds: string[]) => {
        executionPromises.current.clear();
        
        if (!workflowId) return;

        // --- VALIDATION LOGIC ---
        if (scope === 'partial' || scope === 'single') {
            
            // A. Check if ONLY static inputs are selected (Image/Video/Text)
            const selectedNodesList = nodes.filter(n => targetNodeIds.includes(n.id));
            const allAreStatic = selectedNodesList.every(n => 
                n.type === 'textNode' || n.type === 'imageNode' || n.type === 'videoNode'
            );

            if (allAreStatic && selectedNodesList.length > 0) {
                toast.warning("Selected nodes are not runnable", {
                    description: "Input nodes cannot be run directly. Please select a processing node (Crop, AI, etc).",
                    duration: 3000,
                });
                return; // STOP HERE
            }

            // B. Check for Missing Dependencies
            let hasMissingDependencies = false;
            for (const nodeId of targetNodeIds) {
                const inputEdges = edges.filter(e => e.target === nodeId);
                for (const edge of inputEdges) {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    if (sourceNode && !targetNodeIds.includes(sourceNode.id)) {
                        const hasData = sourceNode.data.status === 'success' || (sourceNode.data as any).outputUrl || (sourceNode.data as any).response;
                        const isStatic = sourceNode.type === 'textNode' || sourceNode.type === 'imageNode' || sourceNode.type === 'videoNode';
                        if (!hasData && !isStatic) {
                             hasMissingDependencies = true;
                             break;
                        }
                    }
                }
            }
            if (hasMissingDependencies) {
                toast.error("Cannot run selected nodes", {
                    description: "Some inputs are missing. Please run the previous steps first.",
                    duration: 4000,
                });
                return;
            }
        }

        const triggerMap = { 'full': 'Chain', 'partial': 'Partial', 'single': 'Single Node' };
        const triggerType = triggerMap[scope];
        let currentRunId = ""; 
        const startTime = Date.now();

        try {
            const startRes = await startWorkflowRunAction(workflowId, triggerType);
            if (startRes.success && startRes.runId) {
                currentRunId = startRes.runId;
                addHistoryEntry({
                    id: currentRunId,
                    workflowId,
                    timestamp: startRes.timestamp,
                    status: 'running',
                    duration: '...',
                    triggerType: triggerType as any,
                    nodeExecutions: []
                });
            }

            let nodesToRun = targetNodeIds;
            let allowedSet: Set<string> | null = new Set(targetNodeIds);

            if (scope === 'full') {
                allowedSet = null; 
                const sourceIds = new Set(edges.map(e => e.source));
                const leafNodes = nodes.filter(n => !sourceIds.has(n.id));
                nodesToRun = leafNodes.length > 0 ? leafNodes.map(n => n.id) : nodes.map(n => n.id);
            }

            await Promise.all(nodesToRun.map(id => executeNode(id, currentRunId, allowedSet)));

            if (currentRunId) {
                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                await finishWorkflowRunAction(currentRunId, "success", totalDuration, []);
                updateHistoryEntry({ id: currentRunId, status: 'success', duration: totalDuration });
                toast.success("Workflow completed successfully");
            }

        } catch (error) {
            console.error("Execution failed", error);
            if (currentRunId) {
                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                await finishWorkflowRunAction(currentRunId, "failed", totalDuration, []);
                updateHistoryEntry({ id: currentRunId, status: 'failed', duration: totalDuration });
                toast.error("Workflow run failed");
            }
        }
    }, [executeNode, workflowId, addHistoryEntry, updateHistoryEntry, nodes, edges]);

    return {
        runWorkflow: () => executeRun('full', []),
        runSelected: (ids: string[]) => executeRun(ids.length === 1 ? 'single' : 'partial', ids),
        runNode: (nodeId: string) => executeRun('single', [nodeId])
    };
}