import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash, Settings2 } from 'lucide-react';

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options?: string[];
  required: boolean;
}

export function CustomFields() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
  ];

  const addField = () => {
    const newField: CustomField = {
      id: Math.random().toString(),
      name: 'New Field',
      type: 'text',
      required: false,
    };
    setFields([...fields, newField]);
    setEditingField(newField);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
    if (editingField?.id === id) {
      setEditingField({ ...editingField, ...updates });
    }
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    if (editingField?.id === id) {
      setEditingField(null);
    }
  };

  const renderFieldEditor = (field: CustomField) => {
    return (
      <div className="space-y-4 border rounded-lg p-4 mt-4">
        <div className="space-y-2">
          <Label>Field Name</Label>
          <Input
            value={field.name}
            onChange={(e) => updateField(field.id, { name: e.target.value })}
            placeholder="Enter field name"
          />
        </div>

        <div className="space-y-2">
          <Label>Field Type</Label>
          <Select
            value={field.type}
            onValueChange={(value) => updateField(field.id, { 
              type: value as CustomField['type'],
              options: value === 'select' ? ['Option 1'] : undefined
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {field.type === 'select' && (
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[index] = e.target.value;
                      updateField(field.id, { options: newOptions });
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== index);
                      updateField(field.id, { options: newOptions });
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [...(field.options || []), 'New Option'];
                  updateField(field.id, { options: newOptions });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={`required-${field.id}`}
            checked={field.required}
            onChange={(e) => updateField(field.id, { required: e.target.checked })}
            className="rounded border-gray-300"
          />
          <Label htmlFor={`required-${field.id}`}>Required Field</Label>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Custom Fields</CardTitle>
          <Button onClick={addField}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{field.name}</h3>
                  <p className="text-sm text-gray-500">Type: {field.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingField(
                      editingField?.id === field.id ? null : field
                    )}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteField(field.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingField?.id === field.id && renderFieldEditor(field)}
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No custom fields created yet. Click "Add Field" to create one.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
