import { Node, Edge } from "@xyflow/react";

// =========================================
// 1. LANDING PAGE TYPES (Marketing)
// =========================================

export interface HeroNodeData extends Record<string, unknown> {
    label?: string;
    type?: string;       
    image?: string;     
    text?: string;       
    width?: string;      
    height?: string;     
    gradientClass?: string; 
}

// The specific Node type for the Hero section
export type HeroNode = Node<HeroNodeData>;


// =========================================
// 2. EDITOR APP TYPES (The Actual Tool)
// =========================================

// Common properties shared by ALL nodes in the editor
export interface BaseNodeData extends Record<string, unknown> {
    label?: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorMessage?: string;

    // UI State
    isLocked?: boolean;      
    isRenaming?: boolean;   
}

// -- Text Input Node --
export interface TextNodeData extends BaseNodeData {
    text: string;
    isExpandable?: boolean;
}

// -- Image Upload Node --
export interface ImageNodeData extends BaseNodeData {
    file?: {
        name: string;
        type: string;
        url: string;           
    };
    inputType: 'upload' | 'url';
}

// -- Video Upload Node (NEW) --
export interface VideoNodeData extends BaseNodeData {
    file?: {
        name: string;
        type: string;
        url: string;
    };
}

// -- Crop Image Node (NEW) --
export interface CropNodeData extends BaseNodeData {
    cropX: number;     
    cropY: number;    
    cropWidth: number;  
    cropHeight: number; 
    outputUrl?: string; 
}

// -- Extract Frame Node --
export interface ExtractNodeData extends BaseNodeData {
    timestamp: number | string;
    outputUrl?: string;
}

// -- LLM / Generation Node --
export interface LLMNodeData extends BaseNodeData {
    // Configuration
    model: 'gemini-2.5-flash';
    temperature: number;
    systemInstruction?: string;
    maxTokens?: number;

    imageHandleCount: number; 

    // History / Results
    outputs: Array<{
        id: string;
        type: 'text' | 'image';
        content: string;
        timestamp: number;
        meta?: {
            creditsCost?: number;
            seed?: number;
        };
    }>;

    // View State
    activeOutputId?: string; 
    viewMode: 'single' | 'list';
}


// 1. Define the Full Node Types (This fixes the NodeProps error)
export type TextNodeType = Node<TextNodeData, 'textNode'>;
export type ImageNodeType = Node<ImageNodeData, 'imageNode'>;
export type LLMNodeType = Node<LLMNodeData, 'llmNode'>;
export type VideoNodeType = Node<VideoNodeData, 'videoNode'>;
export type CropNodeType = Node<CropNodeData, 'cropNode'>;
export type ExtractNodeType = Node<ExtractNodeData, 'extractNode'>;

// Union type for the Editor
export type AppNodeData = 
    | TextNodeData 
    | ImageNodeData 
    | LLMNodeData 
    | VideoNodeData 
    | CropNodeData 
    | ExtractNodeData;

export type AppNode = 
    | TextNodeType 
    | ImageNodeType 
    | LLMNodeType
    | VideoNodeType
    | CropNodeType
    | ExtractNodeType;


export type SaveWorkflowParams = {
    id?: string | null;
    name: string;
    nodes: AppNode[];
    edges: Edge[];
};

// TypeScript interface for Workflow
export interface Workflow {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface CanvasControlsProps {
    isHandMode: boolean;
    toggleMode: (isHand: boolean) => void;
}

export interface LoadWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface SidebarProps {
    children: React.ReactNode;
    defaultCollapsed?: boolean;
    className?: string; 
}

// --- HISTORY & EXECUTION TYPES ---

export type RunStatus = 'success' | 'failed' | 'running' | 'pending';

export interface NodeExecutionResult {
    nodeId: string;
    nodeLabel: string;
    status: RunStatus;
    duration: string;
    inputData?: any;
    outputData?: any;
    errorMessage?: string;
}

export interface WorkflowRun {
    id: string;
    workflowId: string;
    timestamp: string;
    status: RunStatus;
    duration: string;
    triggerType: 'Full Run' | 'Partial' | 'Single Node' | 'Chain';
    nodeExecutions: NodeExecutionResult[];
}