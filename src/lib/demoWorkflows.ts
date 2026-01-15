import { AppNode } from "./types";
import { Edge } from "@xyflow/react";

export const DEMO_WORKFLOWS = [
    {
        id: "demo-product-marketing-kit",
        name: "Product Marketing Kit Generator",
        description: "Transform a single product photo and video into a complete social media campaign instantly.",
        thumbnail: "🎯",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop",
        getGraph: (): { nodes: AppNode[], edges: Edge[] } => {
            const nodes: AppNode[] = [
                // --- BRANCH A: IMAGE PROCESSING ---
                {
                    id: "78eea1d2-2da1-4257-905c-844c9f73cb72",
                    type: "imageNode",
                    position: { x: -466, y: 144 },
                    data: {
                        label: "Image Input",
                        status: "success",
                        inputType: "upload",
                        file: {
                            url: "https://pub-e8fef8c0e03b44acb340577811800829.r2.dev/7355d846500a4d50aa33e33317c1d69f/c8fcbf653f8547a7ad8d4ede5eb810a6/b80afbdd846c4e4eb4c77cd93fb16d12.webp",
                            name: "product-photo.webp",
                            type: "image/webp"
                        }
                    }
                },
                {
                    id: "91b5d018-dc44-44e3-a424-843304ab3551",
                    type: "cropNode",
                    position: { x: 328, y: 201 },
                    data: {
                        label: "Crop Image",
                        status: "idle",
                        cropX: 0,
                        cropY: 0,
                        cropWidth: 80,
                        cropHeight: 80
                    }
                },
                {
                    id: "430ec93d-ceae-42b7-a0f5-f037cc8af3f2",
                    type: "textNode",
                    position: { x: 742, y: -194 },
                    data: {
                        label: "System Prompt",
                        status: "idle",
                        text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description."
                    }
                },
                {
                    id: "d8c59929-d8d5-4ca1-b9a9-a3e021ee2f43",
                    type: "textNode",
                    position: { x: 477, y: -59 },
                    data: {
                        label: "Product Details",
                        status: "idle",
                        text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design."
                    }
                },
                {
                    id: "55984a60-d95b-41e5-9478-cf784d1a87dc",
                    type: "llmNode",
                    position: { x: 1074, y: 7 },
                    data: {
                        label: "LLM Node #1",
                        model: "gemini-2.5-flash",
                        status: "idle",
                        imageHandleCount: 1,
                        temperature: 0.7,
                        // FIX: Added missing LLM properties
                        outputs: [],
                        viewMode: "single"
                    }
                },

                // --- BRANCH B: VIDEO PROCESSING ---
                {
                    id: "db5de558-ce09-4424-9898-4a49a3e6166a",
                    type: "videoNode",
                    position: { x: -469, y: 852 },
                    data: {
                        label: "Video Input",
                        status: "success",
                        file: {
                            url: "https://pub-e8fef8c0e03b44acb340577811800829.r2.dev/7355d846500a4d50aa33e33317c1d69f/74d5ae906dce44e38a0dd64f0021bf76/6ffe523deb0846b0a9c92a5adbe0887f.mp4",
                            name: "Video-303.mp4",
                            type: "video/mp4"
                        }
                    }
                },
                {
                    id: "1cfebc48-76aa-4c93-9cc6-c86738adf499",
                    type: "extractNode",
                    position: { x: 398, y: 936 },
                    data: {
                        label: "Extract Frame",
                        status: "idle",
                        // FIX: If your AppNode type only allows anumbers, use a number for now.
                        // Ideally, update the ExtractFrameData type in types.ts to string | number.
                        timestamp: "50%", // Extract frame at 50% of video duration 
                    }
                },

                // --- CONVERGENCE POINT ---
                {
                    id: "9a8b91ea-563c-48c6-b42d-cd8169e87f48",
                    type: "textNode",
                    position: { x: 1127, y: 548 },
                    data: {
                        label: "Social Media Instructions",
                        status: "idle",
                        text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame."
                    }
                },
                {
                    id: "1267b135-c0a4-4357-821c-f59f36d2f9c8",
                    type: "llmNode",
                    position: { x: 1613, y: 602 },
                    data: {
                        label: "Convergence Node (LLM #2)",
                        model: "gemini-2.5-flash",
                        status: "idle",
                        imageHandleCount: 1,
                        temperature: 0.7,
                        // FIX: Added missing LLM properties
                        outputs: [],
                        viewMode: "single"
                    }
                }
            ];

            const edges: Edge[] = [
                { id: "e1", source: "78eea1d2-2da1-4257-905c-844c9f73cb72", target: "91b5d018-dc44-44e3-a424-843304ab3551", targetHandle: "image-in", type: "animatedEdge", animated: true },
                { id: "e2", source: "91b5d018-dc44-44e3-a424-843304ab3551", target: "55984a60-d95b-41e5-9478-cf784d1a87dc", targetHandle: "image-0", type: "animatedEdge", animated: true },
                { id: "e3", source: "430ec93d-ceae-42b7-a0f5-f037cc8af3f2", target: "55984a60-d95b-41e5-9478-cf784d1a87dc", targetHandle: "system-prompt", type: "animatedEdge", animated: true },
                { id: "e4", source: "d8c59929-d8d5-4ca1-b9a9-a3e021ee2f43", target: "55984a60-d95b-41e5-9478-cf784d1a87dc", targetHandle: "prompt", type: "animatedEdge", animated: true },
                { id: "e5", source: "db5de558-ce09-4424-9898-4a49a3e6166a", target: "1cfebc48-76aa-4c93-9cc6-c86738adf499", targetHandle: "video-in", type: "animatedEdge", animated: true },
                { id: "e6", source: "1cfebc48-76aa-4c93-9cc6-c86738adf499", target: "1267b135-c0a4-4357-821c-f59f36d2f9c8", targetHandle: "image-0", type: "animatedEdge", animated: true },
                { id: "e7", source: "55984a60-d95b-41e5-9478-cf784d1a87dc", sourceHandle: "response", target: "1267b135-c0a4-4357-821c-f59f36d2f9c8", targetHandle: "prompt", type: "animatedEdge", animated: true },
                { id: "e8", source: "9a8b91ea-563c-48c6-b42d-cd8169e87f48", target: "1267b135-c0a4-4357-821c-f59f36d2f9c8", targetHandle: "system-prompt", type: "animatedEdge", animated: true }
            ];

            return { nodes, edges };
        }
    }
];