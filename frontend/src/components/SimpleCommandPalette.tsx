import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Search,
  Plus,
  Settings,
  ListTodo,
  GitBranch,
  Home,
} from 'lucide-react';

interface SimpleCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleCommandPalette({ open, onOpenChange }: SimpleCommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

  const commands = [
    {
      icon: <Home className="h-4 w-4" />,
      label: 'Go to Dashboard',
      action: () => navigate('/'),
      keywords: ['home', 'dashboard', 'main'],
    },
    {
      icon: <ListTodo className="h-4 w-4" />,
      label: 'View All Tasks',
      action: () => navigate('/tasks'),
      keywords: ['tasks', 'list', 'view'],
    },
    {
      icon: <GitBranch className="h-4 w-4" />,
      label: 'Manage Integrations',
      action: () => navigate('/integrations'),
      keywords: ['integrations', 'github', 'jira', 'linear'],
    },
    {
      icon: <Plus className="h-4 w-4" />,
      label: 'Create New Task',
      action: () => {
        // TODO: Implement create task
        console.log('Create task');
      },
      keywords: ['new', 'create', 'add', 'task'],
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: 'Open Settings',
      action: () => navigate('/settings'),
      keywords: ['settings', 'preferences', 'config'],
    },
  ];

  const filteredCommands = commands.filter(command => 
    command.label.toLowerCase().includes(search.toLowerCase()) ||
    command.keywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCommand = (command: typeof commands[0]) => {
    command.action();
    onOpenChange(false);
  };

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="grid gap-2">
            {filteredCommands.map((command, index) => (
              <Button
                key={index}
                variant="ghost"
                className="justify-start"
                onClick={() => handleCommand(command)}
              >
                <span className="mr-2">{command.icon}</span>
                {command.label}
              </Button>
            ))}
            {filteredCommands.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No commands found
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
