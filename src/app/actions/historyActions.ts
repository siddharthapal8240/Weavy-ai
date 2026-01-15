"use server";

import { query } from "@/lib/db";
import { WorkflowRun, NodeExecutionResult } from "@/lib/types";
import crypto from "crypto"; 

// --- FETCH HISTORY ---
export async function getWorkflowHistoryAction(workflowId: string) {
    try {
        // Ensure ID is an integer for the DB query
        const numericId = parseInt(workflowId);
        if (isNaN(numericId)) return { success: true, history: [] };

        const runsSql = `
            SELECT 
                id::text, 
                workflow_id, 
                trigger_type, 
                status, 
                TO_CHAR(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Mon DD, YYYY HH12:MI AM') as ist_date,
                duration 
            FROM workflow_runs 
            WHERE workflow_id = $1 
            ORDER BY start_time DESC
        `;
        const runsResult = await query(runsSql, [numericId]); // Use numericId
        const runs = runsResult.rows;

        // 2. Fetch node executions
        const fullHistory: WorkflowRun[] = await Promise.all(runs.map(async (run: any) => {
            const nodesSql = `
                SELECT 
                    node_id, 
                    node_label, 
                    status, 
                    duration, 
                    error_message, 
                    input_data, 
                    output_data 
                FROM node_executions 
                WHERE run_id = $1
                ORDER BY created_at ASC
            `;
            const nodesResult = await query(nodesSql, [run.id]);

            return {
                id: run.id,
                workflowId: run.workflow_id.toString(),
                timestamp: run.ist_date, 
                status: run.status,
                duration: run.duration || "0s",
                triggerType: run.trigger_type,
                nodeExecutions: nodesResult.rows.map((n: any) => ({
                    nodeId: n.node_id,
                    nodeLabel: n.node_label,
                    status: n.status,
                    duration: n.duration,
                    errorMessage: n.error_message,
                    inputData: n.input_data,
                    outputData: n.output_data
                }))
            };
        }));

        return { success: true, history: fullHistory };

    } catch (error) {
        console.error("❌ Failed to fetch history:", error);
        return { success: false, error: "Failed to load history" };
    }
}


export async function startWorkflowRunAction(workflowId: string, triggerType: string) {
    try {
        const runId = crypto.randomUUID();
        const numericId = parseInt(workflowId);

        const runSql = `
            INSERT INTO workflow_runs (id, workflow_id, trigger_type, status, start_time)
            VALUES ($1, $2, $3, 'running', CURRENT_TIMESTAMP)
            RETURNING id, TO_CHAR(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Mon DD, YYYY HH12:MI AM') as ist_date
        `;
        
        const result = await query(runSql, [runId, numericId, triggerType]);
        
        return { 
            success: true, 
            runId: result.rows[0].id,
            timestamp: result.rows[0].ist_date 
        };

    } catch (error) {
        console.error("❌ Failed to start run:", error);
        return { success: false, error: "Failed to start execution log" };
    }
}

export async function finishWorkflowRunAction(
    runId: string, 
    status: string, 
    duration: string,
    nodes: NodeExecutionResult[]
) {
    try {
        // 1. Update Run Status & Duration
        const updateSql = `
            UPDATE workflow_runs 
            SET status = $2, duration = $3, end_time = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING workflow_id, trigger_type, TO_CHAR(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Mon DD, YYYY HH12:MI AM') as ist_date
        `;
        const runResult = await query(updateSql, [runId, status, duration]);
        
        if (runResult.rows.length === 0) {
            throw new Error("Run ID not found to finish");
        }

        const runData = runResult.rows[0];

        // 2. Insert Node Executions
        for (const node of nodes) {
            const executionId = crypto.randomUUID();
            const nodeSql = `
                INSERT INTO node_executions (
                    id, run_id, node_id, node_label, status, duration, error_message, input_data, output_data
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            await query(nodeSql, [
                executionId, 
                runId, 
                node.nodeId, 
                node.nodeLabel, 
                node.status, 
                node.duration, 
                node.errorMessage,
                JSON.stringify(node.inputData || {}),
                JSON.stringify(node.outputData || {})
            ]);
        }

        // 3. Return full object to update UI
        const finishedRun: WorkflowRun = {
            id: runId,
            workflowId: runData.workflow_id.toString(),
            timestamp: runData.ist_date,
            status: status as any,
            duration,
            triggerType: runData.trigger_type as any,
            nodeExecutions: nodes
        };

        return { success: true, run: finishedRun };

    } catch (error) {
        console.error("❌ Failed to finish run:", error);
        return { success: false, error: "Failed to finalize execution log" };
    }
}