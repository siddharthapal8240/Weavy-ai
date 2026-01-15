import { task } from "@trigger.dev/sdk/v3";
import crypto from "crypto";

// --- HELPER: Sign and Run Transloadit Assembly ---
async function runTransloadit(steps: any, inputUrl: string) {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
  const authSecret = process.env.TRANSLOADIT_SECRET;

  if (!authKey || !authSecret) throw new Error("Missing Transloadit credentials");

  const assemblyParams = {
    auth: { key: authKey, expires: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    steps: {
      ...steps,
      ":original": { robot: "/upload/handle", result: true }, // Required boilerplate
      "imported": { robot: "/http/import", url: inputUrl },   // Import the file
    },
  };

  // Sign the request
  const signature = crypto
    .createHmac("sha1", authSecret)
    .update(JSON.stringify(assemblyParams))
    .digest("hex");

  const formData = new FormData();
  formData.append("params", JSON.stringify(assemblyParams));
  formData.append("signature", `sha1:${signature}`);

  // Start Assembly
  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  const assembly = await response.json();
  
  if (assembly.error) throw new Error(assembly.error);

  // Poll for completion (Trigger.dev tasks can run for a long time, so this is safe)
  let finalUrl = null;
  const statusUrl = assembly.assembly_ssl_url;

  while (!finalUrl) {
    await new Promise((r) => setTimeout(r, 1000)); // Wait 1s
    const statusRes = await fetch(statusUrl);
    const status = await statusRes.json();

    if (status.ok === "ASSEMBLY_COMPLETED") {
      // Check for 'cropped' or 'extracted_frame' results
      const resultKey = Object.keys(status.results).find(k => k !== ":original" && k !== "imported");
      if (resultKey && status.results[resultKey]?.length > 0) {
        finalUrl = status.results[resultKey][0].ssl_url;
      } else {
        throw new Error("Assembly completed but no result found.");
      }
    } else if (status.error) {
      throw new Error(status.error);
    }
  }

  return finalUrl;
}

// --- TASK 1: CROP IMAGE ---
export const cropImageTask = task({
  id: "media-crop",
  run: async (payload: { inputUrl: string; params: any }) => {
    const { inputUrl, params } = payload;
    
    // FFmpeg Crop Instructions
    const steps = {
      "cropped": {
        use: "imported",
        robot: "/image/resize",
        crop: {
          x1: `${params.x}%`, y1: `${params.y}%`,
          x2: `${params.x + params.width}%`, y2: `${params.y + params.height}%`
        },
        result: true
      }
    };

    const url = await runTransloadit(steps, inputUrl);
    return { success: true, url };
  },
});

// --- TASK 2: EXTRACT FRAME ---
export const extractFrameTask = task({
  id: "media-extract",
  run: async (payload: { inputUrl: string; params: any }) => {
    const { inputUrl, params } = payload;

    const formatTimestamp = (ts: any) => {
        if (typeof ts === 'string' && ts.endsWith('%')) return ts;
        const num = parseFloat(ts);
        return isNaN(num) ? 0 : num;
    };

    // FFmpeg Frame Extraction Instructions
    const steps = {
      "extracted_frame": {
        use: "imported",
        robot: "/video/thumbs",
        count: 1,
        offsets: [formatTimestamp(params.timestamp)],
        result: true
      }
    };

    const url = await runTransloadit(steps, inputUrl);
    return { success: true, url };
  },
});