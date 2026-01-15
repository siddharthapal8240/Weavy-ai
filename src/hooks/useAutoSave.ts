"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { saveWorkflowAction } from "@/app/actions/workflowActions";

export function useAutoSave() {
  const { 
    nodes, 
    edges, 
    workflowId, 
    workflowName, 
    setWorkflowId, 
    setSaveStatus 
  } = useWorkflowStore();

  // Ref to store the timer ID so we can cancel it
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track if it's the initial mount (to avoid saving empty canvas immediately on load)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (nodes.length === 0) return;

      setSaveStatus('saving');

      try {
        const result = await saveWorkflowAction({
            id: workflowId,
            name: workflowName,
            nodes,
            edges,
        });

        if (result.success && result.id) {
            setWorkflowId(result.id);
            setSaveStatus('saved');
            
            setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
            setSaveStatus('error');
        }
      } catch (error) {
        console.error("Auto-save failed", error);
        setSaveStatus('error');
      }
    }, 2000); 

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [nodes, edges, workflowName, workflowId, setWorkflowId, setSaveStatus]);
}