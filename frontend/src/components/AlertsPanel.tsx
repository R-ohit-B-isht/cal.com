import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, AlertTriangle } from 'lucide-react';
import { api } from '@/services/api';

interface Alert {
  _id: string;
  engineerId: string;
  type: 'daily_limit' | 'weekly_limit';
  message: string;
  percentage: number;
  createdAt: string;
  readAt?: string;
}

interface AlertsPanelProps {
  engineerId: string;
}

export function AlertsPanel({ engineerId }: AlertsPanelProps) {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchAlerts = React.useCallback(async () => {
    try {
      const response = await api.getAlerts(engineerId);
      setAlerts(response.alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [engineerId]);

  React.useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsRead = async (alertId: string) => {
    try {
      await api.markAlertAsRead(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  if (loading) {
    return <div>Loading alerts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Work Hour Alerts
        </CardTitle>
        <CardDescription>
          Notifications about work hour limits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No alerts to display
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-4 border rounded-lg ${
                  !alert.readAt ? 'bg-yellow-50 border-yellow-200' : ''
                }`}
                onClick={() => !alert.readAt && markAsRead(alert._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 ${
                      alert.percentage >= 90 ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant={alert.type === 'daily_limit' ? 'default' : 'secondary'}>
                    {alert.type === 'daily_limit' ? 'Daily' : 'Weekly'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
