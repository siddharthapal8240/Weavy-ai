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
                {
                    "id": "78eea1d2-2da1-4257-905c-844c9f73cb72",
                    "type": "imageNode",
                    "position": {
                        "x": -2,
                        "y": 142
                    },
                    "data": {
                        "label": "Image Input",
                        "status": "success",
                        "inputType": "upload",
                        "file": {
                            "url": "https://pub-e8fef8c0e03b44acb340577811800829.r2.dev/7355d846500a4d50aa33e33317c1d69f/c8fcbf653f8547a7ad8d4ede5eb810a6/b80afbdd846c4e4eb4c77cd93fb16d12.webp",
                            "name": "product-photo.webp",
                            "type": "image/webp"
                        }
                    },
                    "measured": {
                        "width": 300,
                        "height": 344
                    },
                    "selected": false,
                    "dragging": false
                },
                {
                    "id": "430ec93d-ceae-42b7-a0f5-f037cc8af3f2",
                    "type": "textNode",
                    "position": {
                        "x": 742,
                        "y": -194
                    },
                    "data": {
                        "label": "System Prompt",
                        "status": "idle",
                        "text": "You are a professional marketing copywriter. Generate a compelling one-paragraph product description."
                    },
                    "measured": {
                        "width": 250,
                        "height": 168
                    }
                },
                {
                    "id": "d8c59929-d8d5-4ca1-b9a9-a3e021ee2f43",
                    "type": "textNode",
                    "position": {
                        "x": 477,
                        "y": -59
                    },
                    "data": {
                        "label": "Product Details",
                        "status": "idle",
                        "text": "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design."
                    },
                    "measured": {
                        "width": 250,
                        "height": 168
                    }
                },
                {
                    "id": "55984a60-d95b-41e5-9478-cf784d1a87dc",
                    "type": "llmNode",
                    "position": {
                        "x": 1074,
                        "y": 7
                    },
                    "data": {
                        "label": "LLM Node #1",
                        "model": "gemini-2.5-flash",
                        "status": "idle",
                        "imageHandleCount": 1,
                        "temperature": 0.7,
                        "outputs": [],
                        "viewMode": "single"
                    },
                    "measured": {
                        "width": 320,
                        "height": 399
                    }
                },
                {
                    "id": "db5de558-ce09-4424-9898-4a49a3e6166a",
                    "type": "videoNode",
                    "position": {
                        "x": 135,
                        "y": 648
                    },
                    "data": {
                        "label": "Video Input",
                        "status": "success",
                        "file": {
                            "url": "https://pub-e8fef8c0e03b44acb340577811800829.r2.dev/7355d846500a4d50aa33e33317c1d69f/74d5ae906dce44e38a0dd64f0021bf76/6ffe523deb0846b0a9c92a5adbe0887f.mp4",
                            "name": "Video-303.mp4",
                            "type": "video/mp4"
                        }
                    },
                    "measured": {
                        "width": 320,
                        "height": 255
                    },
                    "selected": false,
                    "dragging": false
                },
                {
                    "id": "9a8b91ea-563c-48c6-b42d-cd8169e87f48",
                    "type": "textNode",
                    "position": {
                        "x": 921.8734628438115,
                        "y": 456.5061486247536
                    },
                    "data": {
                        "label": "Social Media Instructions",
                        "status": "idle",
                        "text": "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame."
                    },
                    "measured": {
                        "width": 250,
                        "height": 168
                    },
                    "selected": false,
                    "dragging": false
                },
                {
                    "id": "1267b135-c0a4-4357-821c-f59f36d2f9c8",
                    "type": "llmNode",
                    "position": {
                        "x": 1473,
                        "y": 390
                    },
                    "data": {
                        "label": "Convergence Node (LLM #2)",
                        "model": "gemini-2.5-flash",
                        "status": "idle",
                        "imageHandleCount": 1,
                        "temperature": 0.7,
                        "outputs": [],
                        "viewMode": "single"
                    },
                    "measured": {
                        "width": 320,
                        "height": 411
                    },
                    "selected": false,
                    "dragging": false
                },
                {
                    "id": "e8e99df3-f447-4f59-b1ba-8bf73f0d3c71",
                    "type": "cropNode",
                    "position": {
                        "x": 400.13156497497744,
                        "y": 192.8185078979509
                    },
                    "data": {
                        "label": "Crop Image",
                        "status": "idle",
                        "cropX": 0,
                        "cropY": 0,
                        "cropWidth": 80,
                        "cropHeight": 80
                    },
                    "measured": {
                        "width": 400,
                        "height": 220
                    },
                    "selected": false,
                    "dragging": false
                },
                {
                    "id": "760c75ec-2e32-44a6-af12-4030967a5e55",
                    "type": "extractNode",
                    "position": {
                        "x": 601.1315649749774,
                        "y": 688.8185078979509
                    },
                    "data": {
                        "label": "Extract Frame",
                        "status": "idle",
                        "timestamp": "50%"
                    },
                    "measured": {
                        "width": 321,
                        "height": 165
                    },
                    "selected": false,
                    "dragging": false
                }
            ];

            const edges: Edge[] = [
                {
                    "id": "e3",
                    "source": "430ec93d-ceae-42b7-a0f5-f037cc8af3f2",
                    "target": "55984a60-d95b-41e5-9478-cf784d1a87dc",
                    "targetHandle": "system-prompt",
                    "type": "animatedEdge",
                    "animated": true
                },
                {
                    "id": "e4",
                    "source": "d8c59929-d8d5-4ca1-b9a9-a3e021ee2f43",
                    "target": "55984a60-d95b-41e5-9478-cf784d1a87dc",
                    "targetHandle": "prompt",
                    "type": "animatedEdge",
                    "animated": true
                },
                {
                    "id": "e7",
                    "source": "55984a60-d95b-41e5-9478-cf784d1a87dc",
                    "sourceHandle": "response",
                    "target": "1267b135-c0a4-4357-821c-f59f36d2f9c8",
                    "targetHandle": "prompt",
                    "type": "animatedEdge",
                    "animated": true
                },
                {
                    "id": "e8",
                    "source": "9a8b91ea-563c-48c6-b42d-cd8169e87f48",
                    "target": "1267b135-c0a4-4357-821c-f59f36d2f9c8",
                    "targetHandle": "system-prompt",
                    "type": "animatedEdge",
                    "animated": true
                },
                {
                    "source": "78eea1d2-2da1-4257-905c-844c9f73cb72",
                    "sourceHandle": "output",
                    "target": "e8e99df3-f447-4f59-b1ba-8bf73f0d3c71",
                    "targetHandle": "image-in",
                    "type": "animatedEdge",
                    "animated": true,
                    "style": {
                        "strokeWidth": 3
                    },
                    "id": "xy-edge__78eea1d2-2da1-4257-905c-844c9f73cb72output-e8e99df3-f447-4f59-b1ba-8bf73f0d3c71image-in"
                },
                {
                    "source": "e8e99df3-f447-4f59-b1ba-8bf73f0d3c71",
                    "sourceHandle": "output",
                    "target": "55984a60-d95b-41e5-9478-cf784d1a87dc",
                    "targetHandle": "image-0",
                    "type": "animatedEdge",
                    "animated": true,
                    "style": {
                        "strokeWidth": 3
                    },
                    "id": "xy-edge__e8e99df3-f447-4f59-b1ba-8bf73f0d3c71output-55984a60-d95b-41e5-9478-cf784d1a87dcimage-0"
                },
                {
                    "source": "db5de558-ce09-4424-9898-4a49a3e6166a",
                    "sourceHandle": "video-out",
                    "target": "760c75ec-2e32-44a6-af12-4030967a5e55",
                    "targetHandle": "video-in",
                    "type": "animatedEdge",
                    "animated": true,
                    "style": {
                        "strokeWidth": 3
                    },
                    "id": "xy-edge__db5de558-ce09-4424-9898-4a49a3e6166avideo-out-760c75ec-2e32-44a6-af12-4030967a5e55video-in"
                },
                {
                    "source": "760c75ec-2e32-44a6-af12-4030967a5e55",
                    "sourceHandle": "output",
                    "target": "1267b135-c0a4-4357-821c-f59f36d2f9c8",
                    "targetHandle": "image-0",
                    "type": "animatedEdge",
                    "animated": true,
                    "style": {
                        "strokeWidth": 3
                    },
                    "id": "xy-edge__760c75ec-2e32-44a6-af12-4030967a5e55output-1267b135-c0a4-4357-821c-f59f36d2f9c8image-0"
                }
            ];

            return { nodes, edges };
        }
    }
];