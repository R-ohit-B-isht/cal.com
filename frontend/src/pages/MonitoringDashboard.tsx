import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Award, Activity, Brain } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { api, MonitoringMetrics, Achievement, LeaderboardEntry } from '../services/api';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { ReportPanel } from '../components/ReportPanel';
import { MeetingTimeCard } from '../components/MeetingTimeCard';
import { ScheduleLimits } from '@/components/ScheduleLimits';
import { AlertsPanel } from '@/components/AlertsPanel';

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [dailyLeaderboard, setDailyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([]);

  const fetchData = async () => {
      try {
        const [metricsData, achievementsData, dailyLeaderboardData, weeklyLeaderboardData] = await Promise.all([
          api.getMonitoringMetrics(),
          api.getAchievements(),
          api.getDailyLeaderboard(),
          api.getWeeklyLeaderboard()
        ]);
        setMetrics(metricsData);
        setAchievements(achievementsData.achievements);
        setDailyLeaderboard(dailyLeaderboardData);
        setWeeklyLeaderboard(weeklyLeaderboardData);
      } catch (err) {
        setError('Failed to load monitoring data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    const startSession = async () => {
      try {
        const { sessionId } = await api.startTimeTracking();
        setCurrentSessionId(sessionId);
      } catch (error) {
        console.error('Failed to start time tracking:', error);
      }
    };
    startSession();
    fetchData();
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div>Loading monitoring data...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Monitoring' }
        ]}
      />

      <h1 className="text-2xl font-bold mb-6">Devin's Activity Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Meeting Time */}
        <MeetingTimeCard
          engineerId="current"
          sessionId={currentSessionId}
          onDiscardIdleTime={async () => {
            if (!currentSessionId) return;
            try {
              const response = await api.discardIdleTime(currentSessionId);
              console.log('Idle time discarded:', response);
              // Refresh metrics
              fetchData();
            } catch (error) {
              console.error('Failed to discard idle time:', error);
              setError('Failed to discard idle time');
            }
          }}
        />

        {/* Productivity Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Productivity Score
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress
                value={metrics?.productivityScore || 0}
                className="h-2"
              />
              <p className="text-2xl font-bold">
                {Math.round(metrics?.productivityScore || 0)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Focus Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Focus Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress
                value={metrics?.focusTimePercentage || 0}
                className="h-2"
              />
              <p className="text-2xl font-bold">
                {formatDuration(metrics?.focusTimeSeconds || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Activity Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Activities
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress
                value={(metrics?.focusActivityRatio || 0) * 100}
                className="h-2"
              />
              <p className="text-2xl font-bold">
                {metrics?.focusActivities || 0}/{metrics?.totalActivities || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Achievements
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {achievements.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {metrics?.newBadges?.map((badge) => (
                  <Badge key={badge} variant="secondary" className="animate-pulse">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
          <CardDescription>
            Badges and milestones earned during work sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {achievements.slice(0, 5).map((achievement, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">{achievement.badge}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  Score: {Math.round(achievement.metadata.productivityScore)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <LeaderboardCard
          title="Daily Leaderboard"
          entries={dailyLeaderboard}
          loading={loading}
        />
        <LeaderboardCard
          title="Weekly Leaderboard"
          entries={weeklyLeaderboard}
          loading={loading}
        />
      </div>

      {/* Schedule Limits and Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ScheduleLimits
          engineerId="current"
          onUpdate={() => {
            // Refresh metrics when limits are updated
            fetchData();
          }}
        />
        <AlertsPanel engineerId="current" />
      </div>

      {/* Report Generation */}
      <div className="flex justify-end mb-8">
        <ReportPanel engineerId="current" />
      </div>
    </div>
  );
}
