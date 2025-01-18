import { Button } from '@/components/ui/button';
import { Github, Trello, LineChart } from 'lucide-react';

interface IntegrationFilterProps {
  selectedIntegration: string | null;
  onSelectIntegration: (integration: string | null) => void;
}

export function IntegrationFilter({ selectedIntegration, onSelectIntegration }: IntegrationFilterProps) {
  return (
    <div className="flex gap-2 mb-6">
      <Button
        variant={selectedIntegration === null ? "default" : "outline"}
        onClick={() => onSelectIntegration(null)}
      >
        All
      </Button>
      <Button
        variant={selectedIntegration === 'github' ? "default" : "outline"}
        onClick={() => onSelectIntegration('github')}
      >
        <Github className="mr-2 h-4 w-4" />
        GitHub
      </Button>
      <Button
        variant={selectedIntegration === 'jira' ? "default" : "outline"}
        onClick={() => onSelectIntegration('jira')}
      >
        <Trello className="mr-2 h-4 w-4" />
        Jira
      </Button>
      <Button
        variant={selectedIntegration === 'linear' ? "default" : "outline"}
        onClick={() => onSelectIntegration('linear')}
      >
        <LineChart className="mr-2 h-4 w-4" />
        Linear
      </Button>
    </div>
  );
}
