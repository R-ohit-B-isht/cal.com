import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Handle,
  Position,
} from 'reactflow';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import 'reactflow/dist/style.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash } from 'lucide-react';

// Custom node component with enhanced styling
const CustomNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-2 shadow-lg rounded-lg border bg-white">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-zinc-300 border-2 border-white"
      />
      <div className="font-bold">{data.label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-zinc-300 border-2 border-white"
      />
    </div>
  );
};

// Define node types for ReactFlow
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export function MindMap() {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial nodes and edges
  useEffect(() => {
    console.log('Loading mind map data...');
    const loadMindMap = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedNodes = await api.getMindMapNodes();
        const loadedEdges = await api.getMindMapEdges();

        // If no nodes exist, create a root node
        if (loadedNodes.length === 0) {
          const rootNodeData = {
            label: 'Project Overview',
            position: { x: 0, y: 0 },
          };

          try {
            const result = await api.createMindMapNode(rootNodeData);
            const rootNode = {
              id: result._id,
              type: 'custom',
              data: { label: rootNodeData.label },
              position: rootNodeData.position,
            };
            setNodes([rootNode]);
          } catch (err) {
            console.error('Error creating root node:', err);
            setError('Failed to create root node');
            return;
          }
        } else {
          // Transform API nodes to ReactFlow nodes
          const formattedNodes = loadedNodes.map(node => ({
            id: node._id,
            type: 'custom' as const,
            data: { label: node.label },
            position: node.position
          })) satisfies Node[];

          // Transform API edges to ReactFlow edges
          const formattedEdges = loadedEdges.map(edge => ({
            id: edge._id,
            source: edge.sourceId,
            target: edge.targetId,
            type: 'smoothstep' as const,
            animated: true
          })) satisfies Edge[];

          setNodes(formattedNodes);
          setEdges(formattedEdges);
        }
      } catch (err) {
        console.error('Error loading mind map:', err);
        setError('Failed to load mind map');
      } finally {
        setLoading(false);
      }
    };

    loadMindMap();
  }, [setNodes, setEdges]);

  const onConnect = useCallback(async (params: Connection) => {
    try {
      const result = await api.createMindMapEdge({
        sourceId: params.source!,
        targetId: params.target!
      });
      setEdges((eds) => addEdge({ ...params, id: result._id }, eds));
    } catch (err) {
      console.error('Error creating edge:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create connection"
      });
    }
  }, [setEdges, toast]);

  const addChildNode = useCallback(async () => {
    if (!selectedNode) return;

    try {
      // Calculate position relative to selected node
      const angle = Math.random() * 2 * Math.PI;
      const radius = 150;
      const x = selectedNode.position.x + Math.cos(angle) * radius;
      const y = selectedNode.position.y + Math.sin(angle) * radius;

      const newNodeData = {
        label: 'New Topic',
        position: { x, y },
      };

      const nodeResult = await api.createMindMapNode(newNodeData);
      const newNode = {
        id: nodeResult._id,
        type: 'custom',
        data: { label: newNodeData.label },
        position: newNodeData.position,
      };

      const edgeResult = await api.createMindMapEdge({
        sourceId: selectedNode.id,
        targetId: nodeResult._id,
      });

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, {
        id: edgeResult._id,
        source: selectedNode.id,
        target: nodeResult._id,
        type: 'smoothstep',
        animated: true,
      }]);

      toast({
        title: "Success",
        description: "New node created"
      });
    } catch (err) {
      console.error('Error adding node:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create new node"
      });
    }
  }, [selectedNode, setNodes, setEdges, toast]);

  const deleteNode = useCallback(async () => {
    if (!selectedNode) return;

    try {
      await api.deleteMindMapNode(selectedNode.id);
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
    } catch (err) {
      console.error('Error deleting node:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete node"
      });
    }
  }, [selectedNode, setNodes, setEdges, toast]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Mind Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading mind map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Mind Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex flex-col items-center justify-center text-destructive space-y-2">
            <p>{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mind Map</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addChildNode}
            disabled={!selectedNode}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Child
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteNode}
            disabled={!selectedNode}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] border rounded-lg overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            nodeTypes={nodeTypes}
            className="bg-zinc-50"
          >
            <Background color="#999" gap={16} />
            <Controls />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}
