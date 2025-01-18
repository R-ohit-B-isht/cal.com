import * as React from "react";
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Clock, Bell } from 'lucide-react';
import { api } from '@/services/api';

interface ScheduleLimitsProps {
  engineerId: string;
  onUpdate?: () => void;
}

export function ScheduleLimits({ engineerId, onUpdate }: ScheduleLimitsProps) {
  const [dailyLimit, setDailyLimit] = useState(8);
  const [weeklyLimit, setWeeklyLimit] = useState(40);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const fetchLimits = async () => {
      try {
        const limits = await api.getScheduleLimits(engineerId);
        setDailyLimit(limits.dailyHourLimit);
        setWeeklyLimit(limits.weeklyHourLimit);
        setAlertThreshold(limits.alertThreshold);
      } catch (error) {
        console.error('Failed to fetch schedule limits:', error);
      }
    };

    fetchLimits();
  }, [engineerId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.setScheduleLimits({
        engineerId,
        dailyHourLimit: dailyLimit,
        weeklyHourLimit: weeklyLimit,
        alertThreshold
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to save schedule limits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Schedule Limits
        </CardTitle>
        <CardDescription>
          Set daily and weekly work hour limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Daily Hour Limit</label>
            <div className="flex items-center gap-4">
              <Slider
                value={[dailyLimit]}
                onValueChange={([value]) => setDailyLimit(value)}
                max={24}
                min={1}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-20"
                min={1}
                max={24}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Weekly Hour Limit</label>
            <div className="flex items-center gap-4">
              <Slider
                value={[weeklyLimit]}
                onValueChange={([value]) => setWeeklyLimit(value)}
                max={168}
                min={1}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(Number(e.target.value))}
                className="w-20"
                min={1}
                max={168}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alert Threshold (%)
              </div>
            </label>
            <div className="flex items-center gap-4">
              <Slider
                value={[alertThreshold]}
                onValueChange={([value]) => setAlertThreshold(value)}
                max={100}
                min={50}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-20"
                min={50}
                max={100}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Alerts will trigger when usage reaches {alertThreshold}% of limits
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full"
        >
          Save Limits
        </Button>
      </CardContent>
    </Card>
  );
}
