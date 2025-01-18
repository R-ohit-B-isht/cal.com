import { useState } from 'react';
import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Trophy, Clock, Target } from 'lucide-react';
import { LeaderboardEntry } from '../services/api';

interface LeaderboardCardProps {
  title: string;
  entries: LeaderboardEntry[];
  loading?: boolean;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, entries, loading = false }) => {
  const [showAll, setShowAll] = useState(false);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 animate-pulse bg-muted rounded-md" />
            <div className="h-20 animate-pulse bg-muted rounded-md" />
            <div className="h-20 animate-pulse bg-muted rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayEntries = showAll ? entries : entries.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Trophy className="h-4 w-4 text-yellow-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayEntries.map((entry, index) => (
            <div
              key={entry.engineerId}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">Engineer {entry.engineerId}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(entry.codingTime)}
                    <Target className="h-3 w-3 ml-2" />
                    {Math.round(entry.focusScore)}% focus
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.achievements.map((badge) => (
                  <Badge key={badge} variant="secondary">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {entries.length > 3 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show ${entries.length - 3} More`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
