// =========================================================================
// WorkflowCanvas — Main React Flow canvas with split current/target view,
// node palette, dagre auto-layout, minimap, and controls.
// =========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {
  User,
  Bot,
  GitBranch,
  Database,
  FileOutput,
  Shield,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HumanTaskNode from "./HumanTaskNode";
import AITaskNode from "./AITaskNode";
import DecisionGateNode from "./DecisionGateNode";
import DataSourceNode from "./DataSourceNode";
import OutputNode from "./OutputNode";
import HITLCheckpointNode from "./HITLCheckpointNode";
import type { InteractiveWorkflowNode, WorkflowLiveMetrics } from "@shared/types";

// -------------------------------------------------------------------------
// Props
// -------------------------------------------------------------------------

interface WorkflowCanvasProps {
  currentNodes: InteractiveWorkflowNode[];
  targetNodes: InteractiveWorkflowNode[];
  onCurrentNodesChange: (nodes: InteractiveWorkflowNode[]) => void;
  onTargetNodesChange: (nodes: InteractiveWorkflowNode[]) => void;
  onNodeSelect: (node: InteractiveWorkflowNode | null) => void;
  metrics: WorkflowLiveMetrics | null;
  isGenerating: boolean;
}

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const CURRENT_X_OFFSET = 0;
const TARGET_X_OFFSET = 600;

// -------------------------------------------------------------------------
// Dagre auto-layout helper
// -------------------------------------------------------------------------

function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
  xOffset = 0,
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2 + xOffset,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
    };
  });
}

// -------------------------------------------------------------------------
// Convert InteractiveWorkflowNode to React Flow Node
// -------------------------------------------------------------------------

/**
 * Map an InteractiveWorkflowNode to the correct existing custom node type key.
 * Falls back to "humanTask" for unrecognized configurations.
 */
function resolveNodeType(wn: InteractiveWorkflowNode): string {
  if (wn.isHumanInTheLoop && wn.hitlCheckpoint) return "hitlCheckpoint";
  if (wn.isDecisionPoint) return "decisionGate";
  if (wn.actorType === "ai_agent" && wn.isAIEnabled) return "aiTask";
  if (wn.actorType === "system") {
    // Distinguish data source vs output based on name heuristic
    const nameLower = (wn.name ?? "").toLowerCase();
    if (nameLower.includes("output") || nameLower.includes("report") || nameLower.includes("export")) {
      return "output";
    }
    return "dataSource";
  }
  return "humanTask";
}

function toFlowNodes(
  workflowNodes: InteractiveWorkflowNode[],
  side: "current" | "target",
): Node[] {
  return workflowNodes.map((wn) => ({
    id: `${side}-${wn.id}`,
    type: resolveNodeType(wn),
    position: wn.position ?? { x: 0, y: 0 },
    data: {
      ...wn,
      side,
    },
  }));
}

function toFlowEdges(
  workflowNodes: InteractiveWorkflowNode[],
  side: "current" | "target",
): Edge[] {
  const edges: Edge[] = [];
  workflowNodes.forEach((wn) => {
    (wn.nextNodeIds ?? []).forEach((targetId) => {
      edges.push({
        id: `${side}-edge-${wn.id}-${targetId}`,
        source: `${side}-${wn.id}`,
        target: `${side}-${targetId}`,
        type: "smoothstep",
        animated: side === "target",
        style: {
          stroke: side === "current" ? "#94a3b8" : "#36bf78",
          strokeWidth: 2,
        },
      });
    });

    // Fallback: chain sequential steps if no explicit connections
    if (!wn.nextNodeIds?.length) {
      const idx = workflowNodes.indexOf(wn);
      if (idx < workflowNodes.length - 1) {
        const next = workflowNodes[idx + 1];
        edges.push({
          id: `${side}-edge-${wn.id}-${next.id}`,
          source: `${side}-${wn.id}`,
          target: `${side}-${next.id}`,
          type: "smoothstep",
          animated: side === "target",
          style: {
            stroke: side === "current" ? "#94a3b8" : "#36bf78",
            strokeWidth: 2,
          },
        });
      }
    }
  });
  return edges;
}

const nodeTypes: NodeTypes = {
  humanTask: HumanTaskNode,
  aiTask: AITaskNode,
  decisionGate: DecisionGateNode,
  dataSource: DataSourceNode,
  output: OutputNode,
  hitlCheckpoint: HITLCheckpointNode,
} as unknown as NodeTypes;

// -------------------------------------------------------------------------
// Node Palette (drag to create)
// -------------------------------------------------------------------------

interface PaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  defaults: Partial<InteractiveWorkflowNode>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: "human",
    label: "Human",
    icon: <User className="h-4 w-4" />,
    defaults: {
      actorType: "human",
      actorName: "",
      isAIEnabled: false,
      automationLevel: "manual",
    },
  },
  {
    type: "ai",
    label: "AI Agent",
    icon: <Bot className="h-4 w-4" />,
    defaults: {
      actorType: "ai_agent",
      actorName: "AI Agent",
      isAIEnabled: true,
      automationLevel: "full",
    },
  },
  {
    type: "decision",
    label: "Decision",
    icon: <GitBranch className="h-4 w-4" />,
    defaults: {
      actorType: "human",
      actorName: "",
      isDecisionPoint: true,
      isAIEnabled: false,
      automationLevel: "manual",
    },
  },
  {
    type: "datasource",
    label: "Data Source",
    icon: <Database className="h-4 w-4" />,
    defaults: {
      actorType: "system",
      actorName: "Database",
      isAIEnabled: false,
      automationLevel: "full",
    },
  },
  {
    type: "output",
    label: "Output",
    icon: <FileOutput className="h-4 w-4" />,
    defaults: {
      actorType: "system",
      actorName: "Output",
      isAIEnabled: false,
      automationLevel: "full",
    },
  },
  {
    type: "hitl",
    label: "HITL",
    icon: <Shield className="h-4 w-4" />,
    defaults: {
      actorType: "human",
      actorName: "",
      isHumanInTheLoop: true,
      isAIEnabled: false,
      automationLevel: "supervised",
      hitlCheckpoint: {
        id: "",
        epochCategory: "operational",
        description: "",
        approverRole: "",
        isRequired: true,
        estimatedMinutes: 5,
      },
    },
  },
];

function NodePalette({
  onDragStart,
}: {
  onDragStart: (event: React.DragEvent, item: PaletteItem) => void;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-background/95 p-2 shadow-md backdrop-blur">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add Node
      </span>
      {PALETTE_ITEMS.map((item) => (
        <button
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item)}
          className="flex w-full cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted active:cursor-grabbing"
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------
// WorkflowCanvas Component
// -------------------------------------------------------------------------

export function WorkflowCanvas({
  currentNodes: currentWorkflowNodes,
  targetNodes: targetWorkflowNodes,
  onCurrentNodesChange,
  onTargetNodesChange,
  onNodeSelect,
  metrics,
  isGenerating,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [draggedItem, setDraggedItem] = useState<PaletteItem | null>(null);

  // Build React Flow nodes from both sides
  const initialNodes = useMemo(() => {
    const currentFlowNodes = toFlowNodes(currentWorkflowNodes, "current");
    const currentFlowEdges = toFlowEdges(currentWorkflowNodes, "current");
    const laidOutCurrent = layoutNodes(
      currentFlowNodes,
      currentFlowEdges,
      "TB",
      CURRENT_X_OFFSET,
    );

    const targetFlowNodes = toFlowNodes(targetWorkflowNodes, "target");
    const targetFlowEdges = toFlowEdges(targetWorkflowNodes, "target");
    const laidOutTarget = layoutNodes(
      targetFlowNodes,
      targetFlowEdges,
      "TB",
      TARGET_X_OFFSET,
    );

    return [...laidOutCurrent, ...laidOutTarget];
  }, [currentWorkflowNodes, targetWorkflowNodes]);

  const initialEdges = useMemo(() => {
    const currentEdges = toFlowEdges(currentWorkflowNodes, "current");
    const targetEdges = toFlowEdges(targetWorkflowNodes, "target");
    return [...currentEdges, ...targetEdges];
  }, [currentWorkflowNodes, targetWorkflowNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when external workflow nodes change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#36bf78", strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Handle node click => select the underlying workflow node
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const side = node.data?.side as "current" | "target";
      const originalId = node.id.replace(`${side}-`, "");
      const sourceNodes =
        side === "current" ? currentWorkflowNodes : targetWorkflowNodes;
      const found = sourceNodes.find((n) => n.id === originalId);
      onNodeSelect(found ?? null);
    },
    [currentWorkflowNodes, targetWorkflowNodes, onNodeSelect],
  );

  // Handle clicking on the pane (deselect)
  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Palette drag handlers
  const onPaletteDragStart = useCallback(
    (event: React.DragEvent, item: PaletteItem) => {
      setDraggedItem(item);
      event.dataTransfer.setData("application/reactflow", item.type);
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedItem || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const dropX = event.clientX - bounds.left;
      const isTargetSide = dropX > bounds.width / 2;

      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newNode: InteractiveWorkflowNode = {
        id: newId,
        stepNumber: 0,
        name: `New ${draggedItem.label}`,
        description: "",
        actorType: draggedItem.defaults.actorType ?? "human",
        actorName: draggedItem.defaults.actorName ?? "",
        duration: "",
        systems: [],
        isBottleneck: false,
        isDecisionPoint: draggedItem.defaults.isDecisionPoint ?? false,
        painPoints: [],
        isAIEnabled: draggedItem.defaults.isAIEnabled ?? false,
        isHumanInTheLoop: draggedItem.defaults.isHumanInTheLoop ?? false,
        aiCapabilities: [],
        automationLevel: draggedItem.defaults.automationLevel ?? "manual",
        position: { x: 0, y: 0 },
        ...(draggedItem.defaults.hitlCheckpoint
          ? {
              hitlCheckpoint: {
                ...draggedItem.defaults.hitlCheckpoint,
                id: `hitl-${newId}`,
              },
            }
          : {}),
      };

      if (isTargetSide) {
        onTargetNodesChange([...targetWorkflowNodes, newNode]);
      } else {
        onCurrentNodesChange([...currentWorkflowNodes, newNode]);
      }

      setDraggedItem(null);
    },
    [
      draggedItem,
      currentWorkflowNodes,
      targetWorkflowNodes,
      onCurrentNodesChange,
      onTargetNodesChange,
    ],
  );

  // Auto-layout button handler
  const handleAutoLayout = useCallback(() => {
    const currentFlowNodes = toFlowNodes(currentWorkflowNodes, "current");
    const currentFlowEdges = toFlowEdges(currentWorkflowNodes, "current");
    const laidOutCurrent = layoutNodes(
      currentFlowNodes,
      currentFlowEdges,
      "TB",
      CURRENT_X_OFFSET,
    );

    const targetFlowNodes = toFlowNodes(targetWorkflowNodes, "target");
    const targetFlowEdges = toFlowEdges(targetWorkflowNodes, "target");
    const laidOutTarget = layoutNodes(
      targetFlowNodes,
      targetFlowEdges,
      "TB",
      TARGET_X_OFFSET,
    );

    setNodes([...laidOutCurrent, ...laidOutTarget]);
    setEdges([...currentFlowEdges, ...targetFlowEdges]);
  }, [currentWorkflowNodes, targetWorkflowNodes, setNodes, setEdges]);

  return (
    <div
      ref={reactFlowWrapper}
      className="relative h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Loading overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#02a2fd]" />
            <span className="text-sm font-medium text-muted-foreground">
              Generating workflow...
            </span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        {/* Dot pattern background */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        {/* Minimap in bottom-right */}
        <MiniMap
          position="bottom-right"
          className="!bottom-4 !right-4"
          nodeStrokeWidth={2}
          pannable
          zoomable
        />

        {/* Zoom/Fit controls */}
        <Controls position="bottom-left" className="!bottom-4 !left-20" />

        {/* Column labels */}
        <Panel position="top-left" className="!left-4 !top-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md border bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Current State
            </div>
          </div>
        </Panel>

        <Panel position="top-right" className="!right-4 !top-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md border bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Target State
            </div>
          </div>
        </Panel>

        {/* Node palette */}
        <Panel position="top-left" className="!left-4 !top-14">
          <NodePalette onDragStart={onPaletteDragStart} />
        </Panel>

        {/* Auto-layout button */}
        <Panel position="top-center" className="!top-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleAutoLayout}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Auto Layout
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
