import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from "zundo";
import { getWorkflowHistoryAction } from "@/app/actions/historyActions"; 
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    Connection,
    Edge,
    EdgeChange,
    NodeChange,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
} from "@xyflow/react";

import { AppNode, WorkflowRun, NodeExecutionResult } from '@/lib/types';

type WorkflowState = {
    nodes: AppNode[];
    edges: Edge[];
    workflowId: string | null;
    workflowName: string;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';

    // --- History State ---
    isHistoryOpen: boolean;
    history: WorkflowRun[];
    
    // Actions
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    updateNodeData: (id: string, data: Partial<AppNode['data']>) => void;
    resetWorkflow: () => void;
    addNode: (node: AppNode) => void;
    deleteNode: (id: string) => void;
    setWorkflowId: (id: string) => void;
    setWorkflowName: (name: string) => void;
    setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;

    // --- History Actions ---
    toggleHistory: () => void;
    addHistoryEntry: (run: WorkflowRun) => void;
    updateHistoryEntry: (updatedRun: Partial<WorkflowRun> & { id: string }) => void;
    addNodeToHistoryRun: (runId: string, node: NodeExecutionResult) => void;
    loadHistory: (workflowId: string) => Promise<void>; 
    clearHistory: () => void;
};

// Initial Data
const initialNodesData: AppNode[] = [];
const initialEdges: Edge[] = [];

export const useWorkflowStore = create<WorkflowState>()(
    temporal(
        persist(
            (set, get) => ({
                workflowId: null,
                nodes: initialNodesData,
                edges: initialEdges,
                workflowName: "Untitled Workflow",
                saveStatus: 'idle',
                
                isHistoryOpen: true, 
                history: [],

                onNodesChange: (changes: NodeChange[]) => {
                    set({ nodes: applyNodeChanges(changes, get().nodes) as AppNode[] });
                },

                onEdgesChange: (changes: EdgeChange[]) => {
                    set({ edges: applyEdgeChanges(changes, get().edges) });
                },

                onConnect: (connection: Connection) => {
                    const edge = {
                        ...connection,
                        type: 'animatedEdge', 
                        animated: true,       
                        style: { strokeWidth: 3 },
                    };
                    set({ edges: addEdge(edge, get().edges) });
                },

                updateNodeData: (id: string, newData: Partial<AppNode['data']>) => {
                    set({
                        nodes: get().nodes.map((node) => {
                            if (node.id === id) {
                                return {
                                    ...node,
                                    data: { ...node.data, ...newData },
                                } as AppNode;
                            }
                            return node;
                        }),
                    });
                },

                resetWorkflow: () => {
                    set({ nodes: initialNodesData, edges: initialEdges, history: [] });
                },

                addNode: (node: AppNode) => {
                    set({ nodes: [...get().nodes, node] });
                },

                deleteNode: (id: string) => {
                    set((state) => ({
                        nodes: state.nodes.filter((node) => node.id !== id),
                        edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
                    }));
                },

                setWorkflowId: (id: string) => {
                    set((state) => {
                        // Clear history if we are switching workflows
                        if (state.workflowId !== id) {
                            return { workflowId: id, history: [] }; 
                        }
                        return { workflowId: id };
                    });
                },

                setWorkflowName: (name: string) => set({ workflowName: name }),
                setSaveStatus: (status) => set({ saveStatus: status }),

                toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),
                
                addHistoryEntry: (run: WorkflowRun) => set((state) => ({ 
                    history: [run, ...state.history] 
                })),

                updateHistoryEntry: (updatedRun: Partial<WorkflowRun> & { id: string }) => set((state) => ({
                    history: state.history.map((run) => 
                        run.id === updatedRun.id ? { ...run, ...updatedRun } : run
                    ),
                })),

                addNodeToHistoryRun: (runId: string, node: NodeExecutionResult) => set((state) => ({
                    history: state.history.map((run) => {
                        if (run.id === runId) {
                            return {
                                ...run,
                                nodeExecutions: [...(run.nodeExecutions || []), node]
                            };
                        }
                        return run;
                    })
                })),

                loadHistory: async (workflowId: string) => {
                    if (!workflowId || workflowId === 'new') {
                        set({ history: [] });
                        return;
                    }
                    // Fetch fresh history from DB
                    const res = await getWorkflowHistoryAction(workflowId);
                    if (res.success && res.history) {
                        
                        // --- SYNC LOGIC: Update Canvas Nodes from DB Result ---
                        const latestRun = res.history[0]; // Most recent run
                        if (latestRun && latestRun.nodeExecutions.length > 0) {
                            const currentNodes = get().nodes;
                            
                            // Map execution results back to canvas nodes
                            latestRun.nodeExecutions.forEach((exec) => {
                                const node = currentNodes.find((n) => n.id === exec.nodeId);
                                if (node) {
                                    // Prepare update object
                                    const updatePayload: any = { status: exec.status };
                                    if (exec.errorMessage) updatePayload.errorMessage = exec.errorMessage;

                                    // Parse Output Data
                                    if (exec.outputData) {
                                        const output = exec.outputData as any;
                                        if (output.text) updatePayload.response = output.text;
                                        if (output.url) updatePayload.outputUrl = output.url;
                                        // Handle generic wrapper from workflow.ts
                                        if (output.result) {
                                            if (typeof output.result === 'string' && output.result.startsWith('http')) {
                                                updatePayload.outputUrl = output.result;
                                            } else {
                                                updatePayload.response = output.result;
                                            }
                                        }
                                    }
                                    // Apply update
                                    get().updateNodeData(exec.nodeId, updatePayload);
                                }
                            });
                        }
                        // --- END SYNC LOGIC ---

                        set({ history: res.history });
                    } else {
                        set({ history: [] });
                    }
                },

                clearHistory: () => set({ history: [] }),
            }),
            {
                name: 'workflow-storage',
                storage: createJSONStorage(() => localStorage),
                version: 3, 
                partialize: (state) => {
                    const { nodes, edges, workflowId, isHistoryOpen } = state;
                    return { nodes, edges, workflowId, isHistoryOpen };
                },
            }
        ),
        {
            limit: 100,
            partialize: (state) => {
                const { nodes, edges, workflowId } = state;
                return { nodes, edges, workflowId };
            },
            equality: (pastState, currentState) => {
                const stripVolatile = (state: Partial<WorkflowState>) => {
                    if (!state.nodes || !state.edges) return {};
                    return {
                        edges: state.edges, 
                        nodes: state.nodes.map((node) => {
                            const { position, measured, selected, dragging, ...stableData } = node;
                            return stableData;
                        }),
                    };
                };
                return JSON.stringify(stripVolatile(pastState)) === JSON.stringify(stripVolatile(currentState));
            },
        }
    )
);