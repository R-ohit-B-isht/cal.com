import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  MiniMap,
  useReactFlow,
  ConnectionMode,
  MarkerType,
  EdgeProps,
  getBezierPath,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Task } from '../../../types/Task';
import { Relationship } from '../../../services/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface RelationshipGraphProps {
  task: Task;
  relationships: Relationship[];
  allTasks: Task[];
}

export function RelationshipGraph({ task, relationships, allTasks }: RelationshipGraphProps) {
  // Convert tasks and relationships to nodes and edges
  const getInitialNodes = useCallback(() => {
    const nodes: Node[] = [];
    const addedTaskIds = new Set<string>();

    // Add central task node
    nodes.push({
      id: task._id,
      data: { label: task.title, status: task.status },
      position: { x: 0, y: 0 },
      type: 'default',
      style: {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '10px',
      },
    });
    addedTaskIds.add(task._id);

    // Add related task nodes in a circular layout
    relationships.forEach((rel, index) => {
      const relatedTask = allTasks.find(t => t._id === rel.targetTaskId);
      if (!relatedTask || addedTaskIds.has(rel.targetTaskId)) return;

      const angle = (2 * Math.PI * index) / relationships.length;
      const radius = 200;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      nodes.push({
        id: relatedTask._id,
        data: { label: relatedTask.title, status: relatedTask.status },
        position: { x, y },
        type: 'default',
        style: {
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '10px',
        },
      });
      addedTaskIds.add(relatedTask._id);
    });

    return nodes;
  }, [task, relationships, allTasks]);

  const getInitialEdges = useCallback(() => {
    return relationships.map((rel): Edge => {
      const getEdgeStyle = (type: Relationship['type']) => {
        switch (type) {
          case 'blocks':
          case 'blocked-by':
            return { stroke: '#ef4444', strokeWidth: 4, opacity: 0.8 };
          case 'parent-of':
          case 'child-of':
            return { stroke: '#3b82f6', strokeWidth: 4, opacity: 0.8 };
          case 'duplicates':
            return { stroke: '#8b5cf6', strokeWidth: 3, opacity: 0.8 };
          default:
            return { stroke: '#64748b', strokeWidth: 3, opacity: 0.8 };
        }
      };

      return {
        id: rel._id!,
        source: rel.sourceTaskId,
        target: rel.targetTaskId,
        type: 'custom',
        animated: rel.type === 'blocks' || rel.type === 'blocked-by',
        style: getEdgeStyle(rel.type),
        data: { type: rel.type },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: getEdgeStyle(rel.type).stroke,
        },
      };
    });
  }, [relationships]);

  const memoizedNodes = useCallback(getInitialNodes, [task, relationships, allTasks]);
  const memoizedEdges = useCallback(getInitialEdges, [relationships]);
  
  const initialNodes = useCallback(() => memoizedNodes(), [memoizedNodes, getInitialNodes]);
  const initialEdges = useCallback(() => memoizedEdges(), [memoizedEdges, getInitialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges());

  useEffect(() => {
    setNodes(initialNodes());
    setEdges(initialEdges());
  }, [initialNodes, initialEdges, setNodes, setEdges, relationships, allTasks]);

  const nodeTypes = useMemo(() => ({
    default: ({ data }: { data: { label: string; status: string } }) => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'To-Do':
            return 'bg-yellow-100 border-yellow-300';
          case 'In-Progress':
            return 'bg-blue-100 border-blue-300';
          case 'Done':
            return 'bg-green-100 border-green-300';
          default:
            return 'bg-white';
        }
      };

      return (
        <div className={`px-4 py-2 shadow-lg rounded-lg border hover:shadow-xl transition-shadow ${getStatusColor(data.status)}`}>
          <div className="font-medium text-center">{data.label}</div>
          <div className="mt-2 text-xs text-center opacity-75">{data.status}</div>
        </div>
      );
    },
  }), []);

  const CustomEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    return (
      <>
        <path
          id={id}
          style={style}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd}
        />
        <foreignObject
          width={100}
          height={40}
          x={labelX - 50}
          y={labelY - 20}
          className="edge-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="nodrag nopan">
            <div className="edge-label bg-white px-2 py-1 rounded text-xs shadow-sm text-center">
              {data?.type}
            </div>
          </div>
        </foreignObject>
      </>
    );
  };

  const edgeTypes = useMemo(() => ({
    custom: CustomEdge,
  }), []);

  // Error handling is now managed by ErrorBoundary

  const Flow = () => {
    const { fitView, zoomIn, zoomOut } = useReactFlow();
    return (
      <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={{
        type: 'custom',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: { strokeWidth: 2 },
      }}
      fitView
      attributionPosition="bottom-right"
    >
      <Background gap={16} />
      <Controls />
      <MiniMap />
      <Panel position="top-right" className="bg-background/60 p-2 rounded-lg backdrop-blur-sm">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => zoomIn()}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => zoomOut()}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fitView()}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </Panel>
    </ReactFlow>
    );
  };

  return (
    <div className="h-[400px] border rounded-lg overflow-hidden relative">
      <ErrorBoundary fallback={<div className="p-4 text-destructive">Failed to render relationship graph</div>}>
        <ReactFlowProvider>
          <Flow />
        </ReactFlowProvider>
      </ErrorBoundary>
    </div>
  );
}
