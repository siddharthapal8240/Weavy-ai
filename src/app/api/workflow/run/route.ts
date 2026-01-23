import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { workflowExecutorTask } from "@/trigger/workflow";
import { startWorkflowRunAction } from "@/app/actions/historyActions";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { workflowId, nodes, edges, targetNodeIds } = body;

        // 1. Determine Trigger Type for Logging
        let triggerType = "Full Run";
        if (targetNodeIds && targetNodeIds.length > 0) {
            triggerType = targetNodeIds.length === 1 ? "Single Node" : "Partial Run";
        }

        // 2. Create DB History Entry
        const runInfo = await startWorkflowRunAction(workflowId, triggerType);
        
        if (!runInfo.success || !runInfo.runId) {
            throw new Error("Failed to initialize run in database");
        }

        // 3. Trigger the Server-Side Task
        const handle = await tasks.trigger<typeof workflowExecutorTask>("workflow-executor", {
            runId: runInfo.runId,
            workflowId,
            nodes,
            edges,
            targetNodeIds 
        });

        return NextResponse.json({ 
            success: true, 
            runId: runInfo.runId, 
            taskId: handle.id 
        });

    } catch (error: any) {
        console.error("Workflow Start Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}