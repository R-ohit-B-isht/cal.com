import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Clock, Timer, RotateCcw } from 'lucide-react';

interface TimeEntry {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  description?: string;
}

interface TimeTrackingProps {
  taskId: string;
  estimatedTime?: number; // in hours
  onUpdateEstimate?: (hours: number) => void;
}

export function TimeTracking({ taskId, estimatedTime, onUpdateEstimate }: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [estimate, setEstimate] = useState(estimatedTime || 0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking && currentEntry) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - currentEntry.startTime.getTime()) / 1000);
        setElapsedTime(duration);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTracking, currentEntry]);

  const startTracking = () => {
    const entry: TimeEntry = {
      id: Math.random().toString(),
      taskId,
      startTime: new Date(),
      duration: 0,
    };
    setCurrentEntry(entry);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (currentEntry) {
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - currentEntry.startTime.getTime()) / 1000
      );
      const completedEntry: TimeEntry = {
        ...currentEntry,
        endTime,
        duration,
      };
      setTimeEntries([...timeEntries, completedEntry]);
      setCurrentEntry(null);
      setIsTracking(false);
      setElapsedTime(0);
    }
  };

  const resetTimer = () => {
    if (isTracking) {
      stopTracking();
    }
    setElapsedTime(0);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTotalTrackedTime = () => {
    const completedTime = timeEntries.reduce((acc, entry) => acc + entry.duration, 0);
    const currentTime = currentEntry ? elapsedTime : 0;
    return completedTime + currentTime;
  };

  const getProgress = () => {
    if (!estimate) return 0;
    const totalSeconds = getTotalTrackedTime();
    const estimateSeconds = estimate * 3600;
    return Math.min((totalSeconds / estimateSeconds) * 100, 100);
  };

  const handleEstimateChange = (value: string) => {
    const hours = parseFloat(value) || 0;
    setEstimate(hours);
    if (onUpdateEstimate) {
      onUpdateEstimate(hours);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Time Tracking</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={isTracking ? 'destructive' : 'default'}
              onClick={isTracking ? stopTracking : startTracking}
            >
              {isTracking ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold">
              {formatDuration(elapsedTime)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Current Session</p>
          </div>

          {/* Estimate Input */}
          <div className="space-y-2">
            <Label>Time Estimate (hours)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimate}
                onChange={(e) => handleEstimateChange(e.target.value)}
              />
              <Button variant="outline" className="whitespace-nowrap">
                <Timer className="h-4 w-4 mr-2" />
                Set Estimate
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {estimate > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{getProgress().toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>
          )}

          {/* Time Entries */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Entries
            </Label>
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {entry.startTime.toLocaleTimeString()} -{' '}
                      {entry.endTime?.toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.description || 'No description'}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {formatDuration(entry.duration)}
                  </Badge>
                </div>
              ))}
              {timeEntries.length === 0 && !isTracking && (
                <div className="text-center text-muted-foreground py-4">
                  No time entries yet
                </div>
              )}
            </div>
          </div>

          {/* Total Time */}
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-medium">Total Time</span>
            <Badge variant="default" className="text-lg px-3 py-1">
              {formatDuration(getTotalTrackedTime())}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
