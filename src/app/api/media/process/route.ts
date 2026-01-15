import { NextRequest, NextResponse } from "next/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { cropImageTask, extractFrameTask } from "@/trigger/media";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, inputUrl, params } = body;

        let result;
        let handle;

        // 1. Trigger the Task
        if (type === "crop") {
            handle = await tasks.trigger<typeof cropImageTask>("media-crop", { inputUrl, params });
        } else if (type === "extract") {
            handle = await tasks.trigger<typeof extractFrameTask>("media-extract", { inputUrl, params });
        } else {
            return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
        }

        // 2. Poll for Completion (Manual triggerAndPoll)
        let run = await runs.retrieve(handle.id);
        
        while (!run.finishedAt) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
            run = await runs.retrieve(handle.id);
        }

        // 3. Handle Result
        if (run.status === "COMPLETED") {
            result = run.output;
        } else {
            const errorMsg = typeof run.error === 'string' ? run.error : JSON.stringify(run.error);
            throw new Error(`${type} task failed: ${errorMsg}`);
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Trigger.dev Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}