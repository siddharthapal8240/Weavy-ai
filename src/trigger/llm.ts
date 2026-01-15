import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to fetch image URL and convert to Base64 for Gemini
async function urlToGenerativePart(url: string, mimeType: string = "image/png") {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return {
        inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType
        },
    };
}

export const llmGenerateTask = task({
    id: "llm-generate",
    run: async (payload: { system: string; prompt: string; images?: string[]; model: string }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = payload.model || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        // 1. Prepare Text Parts (System + User)
        // Gemini Flash doesn't strictly separate system/user in the simple API, 
        // so we combine them for best results or use the systemInstruction if on 1.5 Pro.
        // For simplicity:
        const combinedPrompt = `${payload.system ? `System: ${payload.system}\n\n` : ''}User: ${payload.prompt}`;
        
        const parts: any[] = [{ text: combinedPrompt }];

        // 2. Prepare Image Parts (if any)
       if (payload.images && payload.images.length > 0) {
            for (const imgUrl of payload.images) {
                const mime = imgUrl.endsWith(".jpg") || imgUrl.endsWith(".jpeg") ? "image/jpeg" : "image/png";
                const imagePart = await urlToGenerativePart(imgUrl, mime);
                parts.push(imagePart);
            }
        }

        // 3. Generate
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        return { success: true, text };
    },
});