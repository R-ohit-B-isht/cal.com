import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash, Copy, Edit } from 'lucide-react';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultStatus: 'To-Do' | 'In-Progress' | 'Done';
  defaultPriority?: 'high' | 'medium' | 'low';
  estimatedTime?: string;
  labels?: string[];
  customFields?: Record<string, string | number | boolean | null>;
}

export function Templates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const addTemplate = () => {
    const newTemplate: TaskTemplate = {
      id: Math.random().toString(),
      name: 'New Template',
      description: '',
      defaultStatus: 'To-Do',
      labels: [],
    };
    setTemplates([...templates, newTemplate]);
    setEditingTemplate(newTemplate);
  };

  const updateTemplate = (id: string, updates: Partial<TaskTemplate>) => {
    setTemplates(templates.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ));
    if (editingTemplate?.id === id) {
      setEditingTemplate({ ...editingTemplate, ...updates });
    }
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(template => template.id !== id));
    if (editingTemplate?.id === id) {
      setEditingTemplate(null);
    }
  };

  const duplicateTemplate = (template: TaskTemplate) => {
    const newTemplate: TaskTemplate = {
      ...template,
      id: Math.random().toString(),
      name: `${template.name} (Copy)`,
    };
    setTemplates([...templates, newTemplate]);
  };

  const renderTemplateEditor = (template: TaskTemplate) => {
    return (
      <div className="space-y-4 border rounded-lg p-4 mt-4">
        <div className="space-y-2">
          <Label>Template Name</Label>
          <Input
            value={template.name}
            onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
            placeholder="Enter template name"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={template.description}
            onChange={(e) => updateTemplate(template.id, { description: e.target.value })}
            placeholder="Enter template description"
          />
        </div>

        <div className="space-y-2">
          <Label>Default Status</Label>
          <Select
            value={template.defaultStatus}
            onValueChange={(value) => updateTemplate(template.id, { 
              defaultStatus: value as TaskTemplate['defaultStatus']
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="To-Do">To-Do</SelectItem>
              <SelectItem value="In-Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Default Priority</Label>
          <Select
            value={template.defaultPriority || ''}
            onValueChange={(value) => updateTemplate(template.id, { 
              defaultPriority: value as TaskTemplate['defaultPriority']
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Estimated Time (hours)</Label>
          <Input
            type="number"
            value={template.estimatedTime || ''}
            onChange={(e) => updateTemplate(template.id, { 
              estimatedTime: e.target.value 
            })}
            placeholder="Enter estimated time"
          />
        </div>

        <div className="space-y-2">
          <Label>Labels (comma-separated)</Label>
          <Input
            value={template.labels?.join(', ') || ''}
            onChange={(e) => updateTemplate(template.id, { 
              labels: e.target.value.split(',').map(label => label.trim()).filter(Boolean)
            })}
            placeholder="Enter labels"
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task Templates</CardTitle>
          <Button onClick={addTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {templates.map(template => (
            <div key={template.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-500">
                    Status: {template.defaultStatus}
                    {template.defaultPriority && ` • Priority: ${template.defaultPriority}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingTemplate(
                      editingTemplate?.id === template.id ? null : template
                    )}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => duplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingTemplate?.id === template.id && renderTemplateEditor(template)}
            </div>
          ))}
          {templates.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No templates created yet. Click "Add Template" to create one.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
