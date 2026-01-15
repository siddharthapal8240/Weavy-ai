"use client";

import React, { useCallback } from "react";
import { EdgeProps, getBezierPath, useStore } from "@xyflow/react";

// --- Configuration: Node Type Colors (Source Side) ---
const NODE_COLORS: Record<string, string> = {
  textNode: "#d97706",
  imageNode: "#2563eb",
  llmNode: "#dfff4f",
  default: "#ffffff",
};

// Helper: Get color based on Node Type (for the Start of the edge)
function getNodeColor(node: any) {
  if (node?.data?.color) return node.data.color;
  if (node?.type && NODE_COLORS[node.type]) return NODE_COLORS[node.type];
  return NODE_COLORS.default;
}

// Helper: Get color based on Target Handle ID (for the End of the edge)
function getTargetHandleColor(handleId: string | null | undefined, defaultColor: string) {
  if (!handleId) return defaultColor;

  // Specific Handle Colors for LLM Node Inputs
  if (handleId === "system-prompt") return "#15803d";
  if (handleId === "prompt") return "#d97706";
  if (handleId.startsWith("image-")) return "#2563eb";

  return defaultColor;
}

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  targetHandleId,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  );

  // 1. Start Color matches the Source Node Type
  const startColor = getNodeColor(sourceNode);

  // 2. End Color matches the specific Target Handle
  const nodeDefaultColor = getNodeColor(targetNode);
  const endColor = getTargetHandleColor(targetHandleId, nodeDefaultColor);

  return (
    <>
      <defs>
        <linearGradient
          id={`gradient-${id}`}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>

      {/* Invisible interaction path (Thick for easier clicking) */}
      <path
        d={edgePath}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
        className="react-flow__edge-interaction"
      />

      {/* Visible Path - Slick & Moving */}
      <path
        id={id}
        style={{
          ...style,
          stroke: `url(#gradient-${id})`,
          strokeWidth: 2, 
          strokeDasharray: "5 5",
          animation: "dashdraw 1s linear infinite",
          strokeLinecap: "round", 
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Animation Definition */}
      <style>
        {`
          @keyframes dashdraw {
            from {
              stroke-dashoffset: 10;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </>
  );
}