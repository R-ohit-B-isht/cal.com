import { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Square, Circle, Type, Undo, Redo, Download } from 'lucide-react';

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  strokeWidth: number;
}

export function Whiteboard() {
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!stage || !pos) return;
    setLines([...lines, { tool, points: [pos.x, pos.y], color, strokeWidth }]);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!stage || !point) return;
    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    setLines([...lines.slice(0, -1), lastLine]);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleUndo = () => {
    if (lines.length === 0) return;
    setLines(lines.slice(0, -1));
  };

  const handleRedo = () => {
    // TODO: Implement redo functionality
  };

  const handleDownload = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tools = [
    { name: 'pen', icon: <Pencil className="h-4 w-4" /> },
    { name: 'eraser', icon: <Eraser className="h-4 w-4" /> },
    { name: 'rectangle', icon: <Square className="h-4 w-4" /> },
    { name: 'circle', icon: <Circle className="h-4 w-4" /> },
    { name: 'text', icon: <Type className="h-4 w-4" /> },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Whiteboard</CardTitle>
        <div className="flex items-center gap-2">
          {tools.map((t) => (
            <Button
              key={t.name}
              variant={tool === t.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool(t.name)}
            >
              {t.icon}
            </Button>
          ))}
          <div className="h-6 w-px bg-border" />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 rounded-md border cursor-pointer"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="w-24"
          />
          <div className="h-6 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Stage
            ref={stageRef}
            width={800}
            height={600}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            className="bg-white"
          >
            <Layer>
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === 'eraser' ? 'destination-out' : 'source-over'
                  }
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </CardContent>
    </Card>
  );
}
