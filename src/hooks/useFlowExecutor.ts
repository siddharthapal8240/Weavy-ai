"use client";

import { useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { startWorkflowRunAction, finishWorkflowRunAction } from "@/app/actions/historyActions";
import { WorkflowRun, NodeExecutionResult } from "@/lib/types";

export function useFlowExecutor() {
    const { nodes, edges, updateNodeData, workflowId, addHistoryEntry, updateHistoryEntry, addNodeToHistoryRun } = useWorkflowStore();
    
    // Use a ref to track in-flight execution promises for parallel branches
    const executionPromises = useRef<Map<string, Promise<string | null>>>(new Map());

    const executeNode = useCallback(async (nodeId: string, runId: string): Promise<string | null> => {
        // 1. If this node is already executing/executed in this run, return its existing promise
        if (executionPromises.current.has(nodeId)) {
            return executionPromises.current.get(nodeId)!;
        }

        const nodePromise = (async () => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) throw new Error(`Node ${nodeId} not found`);

            // --- BASE CASES ---
            if (node.type === "videoNode" || node.type === "imageNode") {
                const url = (node.data as any).file?.url;
                if (!url) throw new Error(`${node.type} "${node.data.label}" has no file`);
                return url;
            }
            if (node.type === "textNode") {
                return (node.data as any).text || "";
            }

            // --- PROCESSING START ---
            updateNodeData(nodeId, { status: "loading", errorMessage: undefined });
            const startTime = Date.now();
            let resultUrl: string | null = null;
            let inputDataLog: any = {};
            let outputDataLog: any = {};

            try {
                // Parallel Execution of Dependencies
                // Instead of awaiting them one-by-one, we initiate all upstream executions simultaneously
                const upstreamEdges = edges.filter((e) => e.target === nodeId);
                
                // Trigger all parent nodes at once (Parallelism happens here)
                const upstreamResults = await Promise.all(
                    upstreamEdges.map(async (edge) => {
                        const result = await executeNode(edge.source, runId);
                        return { handle: edge.targetHandle, value: result };
                    })
                );

                // --- A. EXTRACT FRAME ---
                if (node.type === "extractNode") {
                    const source = upstreamResults.find(r => r.handle === "video-in")?.value;
                    if (!source) throw new Error("Source video not ready");

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
                    if (!res.success) throw new Error(res.error);
                    resultUrl = res.url;
                    inputDataLog = { timestamp: node.data.timestamp, source };
                    outputDataLog = { url: resultUrl };
                }

                // --- B. CROP IMAGE ---
                else if (node.type === "cropNode") {
                    const source = upstreamResults.find(r => r.handle === "image-in")?.value;
                    if (!source) throw new Error("Source image not ready");

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
                    if (!res.success) throw new Error(res.error);
                    resultUrl = res.url;
                    inputDataLog = { source, params: node.data };
                    outputDataLog = { url: resultUrl };
                }

                // --- C. LLM GENERATION ---
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
                    if (!res.success) throw new Error(res.error);
                    resultUrl = res.text;
                    outputDataLog = { text: res.text };
                    updateNodeData(nodeId, { response: res.text });
                }

                // --- PERSISTENCE & UI UPDATE ---
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

    const runWorkflow = useCallback(async (startNodeId: string) => {
        // Reset execution map for new run
        executionPromises.current.clear();
        
        let currentRunId: string = ""; 
        const startTime = Date.now();

        try {
            if (workflowId) {
                const startRes = await startWorkflowRunAction(workflowId, "Chain");
                if (startRes.success && startRes.runId) {
                    currentRunId = startRes.runId;
                    addHistoryEntry({
                        id: currentRunId,
                        workflowId,
                        timestamp: startRes.timestamp,
                        status: 'running',
                        duration: '...',
                        triggerType: 'Chain', 
                        nodeExecutions: []
                    });
                }
            }

            await executeNode(startNodeId, currentRunId);

            if (workflowId && currentRunId) {
                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                await finishWorkflowRunAction(currentRunId, "success", totalDuration, []);
                updateHistoryEntry({ id: currentRunId, status: 'success', duration: totalDuration });
            }

        } catch (error) {
            if (workflowId && currentRunId) {
                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                await finishWorkflowRunAction(currentRunId, "failed", totalDuration, []);
                updateHistoryEntry({ id: currentRunId, status: 'failed', duration: totalDuration });
            }
        }
    }, [executeNode, workflowId, addHistoryEntry, updateHistoryEntry]);

    return { runWorkflow };
}