import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Github, Trello, LineChart } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  icon: JSX.Element;
  connected: boolean;
  domain?: string;
}

const integrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: <Github className="h-5 w-5" />,
    connected: true,
    domain: 'github.com/your-org'
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: <Trello className="h-5 w-5" />,
    connected: true,
    domain: 'your-jira-domain.atlassian.net'
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: <LineChart className="h-5 w-5" />,
    connected: true,
    domain: 'linear.app'
  }
];

export function IntegrationManagementPage() {
  const handleDisconnect = (integrationId: string) => {
    // TODO: Implement disconnect logic
    console.log('Disconnect:', integrationId);
  };

  const handleConnect = (integrationId: string) => {
    // TODO: Implement connect logic
    console.log('Connect:', integrationId);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Integration Management</h1>
      
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {integration.icon}
                  <CardTitle className="text-lg">{integration.name}</CardTitle>
                </div>
                <Button
                  variant={integration.connected ? "destructive" : "default"}
                  onClick={() => integration.connected 
                    ? handleDisconnect(integration.id)
                    : handleConnect(integration.id)
                  }
                >
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </CardHeader>
            {integration.connected && integration.domain && (
              <CardContent>
                <p className="text-sm text-gray-500">
                  Connected to: {integration.domain}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
