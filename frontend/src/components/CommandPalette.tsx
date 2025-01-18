import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Dialog,
  DialogContent,
} from './ui/dialog';
import {
  Search,
  Plus,
  Settings,
  ListTodo,
  GitBranch,
  Home,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

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

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/'))}
                className="flex cursor-pointer items-center px-2 py-1 text-sm"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/tasks'))}
                className="flex cursor-pointer items-center px-2 py-1 text-sm"
              >
                <ListTodo className="mr-2 h-4 w-4" />
                View All Tasks
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/integrations'))}
                className="flex cursor-pointer items-center px-2 py-1 text-sm"
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Manage Integrations
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() => runCommand(() => {/* TODO: Implement create task */})}
                className="flex cursor-pointer items-center px-2 py-1 text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Task
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/settings'))}
                className="flex cursor-pointer items-center px-2 py-1 text-sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Open Settings
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
