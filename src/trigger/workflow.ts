import { task, tasks, runs, wait } from "@trigger.dev/sdk/v3";
import { llmGenerateTask } from "@/trigger/llm";
import { cropImageTask, extractFrameTask } from "@/trigger/media";
import { query } from "@/lib/db";
import crypto from "crypto";

type WorkflowPayload = {
  runId: string;
  workflowId: string;
  nodes: any[];
  edges: any[];
  targetNodeIds?: string[];
};

export const workflowExecutorTask = task({
  id: "workflow-executor",
  run: async (payload: WorkflowPayload) => {
    const { runId, nodes, edges, targetNodeIds } = payload;
    const executionResults = new Map<string, any>();
    const completedNodes = new Set<string>();
    const nodeExecutionIds = new Map<string, string>(); 

    const isStaticNode = (n: any) => ['textNode', 'imageNode', 'videoNode'].includes(n.type);

    const logNodeExecution = async (nodeId: string, status: string, data: any, duration: string) => {
      const node = nodes.find(n => n.id === nodeId);
      const label = node?.data?.label || node?.type;
      const existingDbId = nodeExecutionIds.get(nodeId);

      if (existingDbId && status !== 'running') {
        await query(`
            UPDATE node_executions 
            SET status = $1, duration = $2, output_data = $3, error_message = $4
            WHERE id = $5
        `, [status, duration, JSON.stringify(data), status === 'failed' ? (data.error || "Unknown Error") : null, existingDbId]);
      } else {
        const executionId = crypto.randomUUID();
        if (status === 'running') nodeExecutionIds.set(nodeId, executionId);

        await query(`
            INSERT INTO node_executions (id, run_id, node_id, node_label, status, duration, output_data, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [executionId, runId, nodeId, label, status, duration, JSON.stringify(data), status === 'failed' ? (data.error || "Unknown Error") : null]);
      }
    };

    // --- CASCADING FAILURE ---
    const markDownstreamAsFailed = async (parentId: string) => {
        const childEdges = edges.filter(e => e.source === parentId);
        
        for (const edge of childEdges) {
            const childId = edge.target;
            if (!completedNodes.has(childId)) {
                
                // Log the failure to the DB so the UI updates
                await logNodeExecution(childId, "failed", { error: "Execution cancelled: Parent node failed." }, "0s");
                completedNodes.add(childId);

                await markDownstreamAsFailed(childId);
            }
        }
    };

    // --- 1. DETERMINE ACTIVE NODES ---
    let activeNodes = nodes;
    
    if (targetNodeIds && targetNodeIds.length > 0) {
        activeNodes = nodes.filter(n => targetNodeIds.includes(n.id));
        
        const staticParents = new Set<string>();
        targetNodeIds.forEach(id => {
            edges.filter(e => e.target === id).forEach(edge => {
                const parent = nodes.find(n => n.id === edge.source);
                if (parent && isStaticNode(parent)) staticParents.add(parent.id);
            });
        });
        
        const staticParentNodes = nodes.filter(n => staticParents.has(n.id));
        activeNodes = [...activeNodes, ...staticParentNodes];
    }

    // --- 2. EXECUTION LOOP ---
    let hasProgress = true;
    let hasError = false; 

    // Loop continues as long as there are incomplete active nodes AND we are making progress AND no error occurred
    while (activeNodes.some(n => !completedNodes.has(n.id)) && hasProgress && !hasError) {
      hasProgress = false;
      const nodesToRun: any[] = [];

      for (const node of activeNodes) {
        if (completedNodes.has(node.id)) continue;
        
        const inputEdges = edges.filter(e => e.target === node.id);
        const dependenciesMet = inputEdges.every(e => completedNodes.has(e.source));
        
        if (dependenciesMet) {
          nodesToRun.push(node);
        }
      }

      if (nodesToRun.length > 0) {
        hasProgress = true;
        const activeRuns: { nodeId: string, runId: string }[] = [];

        for (const node of nodesToRun) {
            const inputs: any = {};
            edges.filter(e => e.target === node.id).forEach(e => {
                const fresh = executionResults.get(e.source);
                if (fresh) inputs[e.targetHandle || 'default'] = fresh;
            });

            // A. Static Nodes
            if (isStaticNode(node)) {
                const val = node.data.text || node.data.file?.url || node.data.image || (node.data as any).outputUrl;
                
                if (val) {
                    executionResults.set(node.id, val);
                    completedNodes.add(node.id);
                } else {
                    await logNodeExecution(node.id, "failed", { error: "Input node is empty" }, "0s");
                    await markDownstreamAsFailed(node.id); // Fail downstream
                    hasError = true;
                }
                continue; 
            }

            // B. Executable Nodes
            await logNodeExecution(node.id, "running", {}, "...");

            let handle;
            try {
                if (node.type === "llmNode") {
                    handle = await tasks.trigger<typeof llmGenerateTask>("llm-generate", {
                        system: inputs["system-prompt"],
                        prompt: inputs["prompt"] || node.data.userPrompt,
                        images: Object.keys(inputs).filter(k => k.startsWith("image")).map(k => inputs[k]),
                        model: node.data.model
                    });
                } else if (node.type === "cropNode") {
                    handle = await tasks.trigger<typeof cropImageTask>("media-crop", {
                        inputUrl: Object.values(inputs)[0] as string,
                        params: { x: node.data.cropX, y: node.data.cropY, width: node.data.cropWidth, height: node.data.cropHeight }
                    });
                } else if (node.type === "extractNode") {
                    handle = await tasks.trigger<typeof extractFrameTask>("media-extract", {
                        inputUrl: Object.values(inputs)[0] as string,
                        params: { timestamp: node.data.timestamp }
                    });
                }

                if (handle) {
                    activeRuns.push({ nodeId: node.id, runId: handle.id });
                }
            } catch (err: any) {
                console.error("Trigger failed", err);
                await logNodeExecution(node.id, "failed", { error: err.message }, "0s");
                await markDownstreamAsFailed(node.id); // Fail downstream
                hasError = true;
            }
        }

        // C. Poll for Batch Completion
        if (activeRuns.length > 0) {
            const pendingRuns = new Set(activeRuns.map(r => r.runId));
            
            while (pendingRuns.size > 0) {
                await wait.for({ seconds: 1 });

                for (const { nodeId, runId } of activeRuns) {
                    if (!pendingRuns.has(runId)) continue;

                    const run = await runs.retrieve(runId);

                    if (run.status === "COMPLETED") {
                        pendingRuns.delete(runId);
                        
                        const output = run.output as any;
                        const resultVal = output?.text || output?.url || output?.result; 

                        executionResults.set(nodeId, resultVal);
                        completedNodes.add(nodeId);
                        
                        const durationText = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "2s";
                        await logNodeExecution(nodeId, "success", { result: resultVal }, durationText);
                    } 
                    else if (["CANCELED", "FAILED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT", "EXPIRED"].includes(run.status)) {
                        pendingRuns.delete(runId);
                        
                        const errorMsg = run.error ? JSON.stringify(run.error) : `Task failed: ${run.status}`;
                        await logNodeExecution(nodeId, "failed", { error: errorMsg }, "0s");
                        
                        // CASCADING FAILURE TRIGGER
                        await markDownstreamAsFailed(nodeId); 
                        
                        hasError = true; 
                    }
                }
            }
        }
      }
    }

    const finalStatus = hasError ? 'failed' : 'success';
    await query(`UPDATE workflow_runs SET status = $1, duration = 'Done', end_time = NOW() WHERE id = $2`, [finalStatus, runId]);
    return { success: !hasError };
  },
});