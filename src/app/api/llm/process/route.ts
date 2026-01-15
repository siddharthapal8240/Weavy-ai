import { NextRequest, NextResponse } from "next/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { llmGenerateTask } from "@/trigger/llm";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { system, prompt, images, model } = body;

        // 1. Trigger the LLM Background Task
        const handle = await tasks.trigger<typeof llmGenerateTask>("llm-generate", { 
            system: system || "",
            prompt: prompt || "",
            images: images || [],
            model: model || "gemini-2.5-flash"
        });

        // 2. Poll for Completion (Manual loop for reliability)
        let run = await runs.retrieve(handle.id);
        
        while (!run.finishedAt) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            run = await runs.retrieve(handle.id);
        }

        // 3. Return Result
        if (run.status === "COMPLETED") {
            return NextResponse.json(run.output);
        } else {
            const errorMsg = typeof run.error === 'string' ? run.error : JSON.stringify(run.error);
            throw new Error(`LLM task failed: ${errorMsg}`);
        }

    } catch (error: any) {
        console.error("LLM Trigger Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}