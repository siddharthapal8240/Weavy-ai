"use client";

import React, {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {Loader2} from "lucide-react"; 
import dynamic from "next/dynamic";
import Sidebar from "@/components/workflow/Sidebar";
import SidebarNodeList from "@/components/workflow/SidebarNodeList";
import Header from "@/components/workflow/Header";
import HistorySidebar from "@/components/workflow/HistorySidebar";
import {useWorkflowStore} from "@/store/workflowStore";
import {loadWorkflowAction} from "@/app/actions/workflowActions";
import {DEMO_WORKFLOWS} from "@/lib/demoWorkflows";
import {useAutoSave} from "@/hooks/useAutoSave";
import { Toaster } from "sonner";

const FlowEditor = dynamic(() => import("@/components/workflow/FlowEditor"), {
    ssr: false,
});

export default function EditorPage() {
    const params = useParams();
    const workflowId = params.id as string;

    const [loading, setLoading] = useState(true);
    
    const {setWorkflowId} = useWorkflowStore();

    // Activate Auto-Save
    useAutoSave();

    useEffect(() => {
        async function initializeWorkflow() {
            if (!workflowId) {
                setLoading(false);
                return;
            }

            setLoading(true);

            // Check for Demo Template
            const demo = DEMO_WORKFLOWS.find((d) => d.id === workflowId);
            if (demo) {
                const {nodes, edges} = demo.getGraph();
                useWorkflowStore.setState({
                    nodes: nodes,
                    edges: edges,
                    workflowId: null,
                    workflowName: demo.name,
                });
                setLoading(false);
                return;
            }

            // Check if "new"
            if (workflowId === "new") {
                useWorkflowStore.setState({
                    nodes: [],
                    edges: [],
                    workflowId: null,
                    workflowName: "Untitled Workflow",
                });
                setLoading(false);
                return;
            }

            // Load from Database
            try {
                const res = await loadWorkflowAction(workflowId);
                if (res.success && res.data) {
                    const flowData = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

                    useWorkflowStore.setState({
                        nodes: flowData.nodes || [],
                        edges: flowData.edges || [],
                        workflowId: workflowId,
                        workflowName: res.name || "Untitled Workflow",
                    });
                } else {
                    useWorkflowStore.setState({
                        nodes: [],
                        edges: [],
                        workflowId: null,
                        workflowName: "Untitled Workflow",
                    });
                }
            } catch (error) {
                console.error("Failed to load workflow:", error);
                useWorkflowStore.setState({
                    nodes: [],
                    edges: [],
                    workflowId: null,
                    workflowName: "Untitled Workflow",
                });
            } finally {
                setLoading(false);
            }
        }

        initializeWorkflow();
    }, [workflowId, setWorkflowId]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white">
                <Loader2 className="animate-spin mb-2" size={32} />
                <span className="text-sm text-white/50 ml-2">Loading workflow...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full bg-[#09090b] text-white overflow-hidden">
            <Toaster position="top-center" richColors theme="dark" />
            {/* Header */}
            <Header />

            {/* Main Layout Area */}
            <div className="flex flex-1 h-full overflow-hidden pt-0">
                
                {/* 1. LEFT SIDEBAR (Node Registry) */}
                <Sidebar defaultCollapsed={true}>
                    <SidebarNodeList />
                </Sidebar>

                {/* 2. CENTER CANVAS */}
                <main className="flex-1 relative h-full bg-[#000]">
                    <FlowEditor />
                </main>

                {/* 3. RIGHT SIDEBAR (History) */}
                <HistorySidebar />
                
            </div>
        </div>
    );
}