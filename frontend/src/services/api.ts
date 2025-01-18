import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export interface MonitoringMetrics {
  focusTimeSeconds: number;
  focusTimePercentage: number;
  totalActivities: number;
  focusActivities: number;
  focusActivityRatio: number;
  productivityScore: number;
  newBadges: string[];
}

export interface MeetingTimeMetrics {
  totalMeetingTime: number;
  meetingCount: number;
  date: string;
}

export interface IdleTimeResponse {
  message: string;
  idleIntervals: number;
  totalIdleTime: number;
}

export interface LeaderboardEntry {
  engineerId: string;
  codingTime: number;
  focusScore: number;
  achievements: string[];
}

export interface Achievement {
  badge: string;
  earnedAt: string;
  metadata: {
    sessionId: string;
    productivityScore: number;
    focusTime: number;
    totalActivities: number;
  };
}

export interface PersonalBests {
  engineerId: string;
  metrics: {
    dailyCodingTime: number;
    weeklyFocusScore: number;
    longestFocusStreak: number;
  };
  lastUpdated: string;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  groupedByBadge: Record<string, Achievement[]>;
  totalCount: number;
}

export interface ScheduleLimits {
  dailyHourLimit: number;
  weeklyHourLimit: number;
  alertThreshold: number;
}

export interface Alert {
  _id: string;
  engineerId: string;
  type: 'daily_limit' | 'weekly_limit';
  message: string;
  percentage: number;
  createdAt: string;
  readAt?: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  totalCount: number;
}

export const api = {
  // Monitoring endpoints
  getMonitoringMetrics: async (): Promise<MonitoringMetrics> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/focus-metrics/current`);
    return response.data;
  },

  // Schedule Limits endpoints
  getScheduleLimits: async (engineerId: string): Promise<ScheduleLimits> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/schedule-limits/${engineerId}`);
    return response.data;
  },

  setScheduleLimits: async (data: ScheduleLimits & { engineerId: string }): Promise<void> => {
    await axios.post(`${API_BASE_URL}/monitoring/schedule-limits`, data);
  },

  // Alerts endpoints
  getAlerts: async (engineerId: string): Promise<AlertsResponse> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/alerts/${engineerId}`);
    return response.data;
  },

  markAlertAsRead: async (alertId: string): Promise<void> => {
    await axios.post(`${API_BASE_URL}/monitoring/alerts/${alertId}/read`);
  },

  getAchievements: async (): Promise<AchievementsResponse> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/achievements/current`);
    return response.data;
  },

  startTimeTracking: async (): Promise<{ sessionId: string }> => {
    const response = await axios.post(`${API_BASE_URL}/monitoring/start-time`, {
      engineerId: 'current'
    });
    return response.data;
  },

  stopTimeTracking: async (sessionId: string): Promise<{ duration: number }> => {
    const response = await axios.post(`${API_BASE_URL}/monitoring/stop-time`, {
      sessionId
    });
    return response.data;
  },

  recordActivity: async (sessionId: string, eventType: string, metadata?: any): Promise<void> => {
    await axios.post(`${API_BASE_URL}/monitoring/activity`, {
      engineerId: 'current',
      sessionId,
      eventType,
      metadata
    });
  },

  // Leaderboard endpoints
  getDailyLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await axios.get(`${API_BASE_URL}/leaderboard/daily`);
    return response.data;
  },

  getWeeklyLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await axios.get(`${API_BASE_URL}/leaderboard/weekly`);
    return response.data;
  },

  getPersonalBests: async (engineerId: string): Promise<PersonalBests> => {
    const response = await axios.get(`${API_BASE_URL}/personal-bests/${engineerId}`);
    return response.data;
  },

  // Report endpoints
  getReportSummary: async (): Promise<{
    timeRanges: string[];
    metrics: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    formats: string[];
  }> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/report/summary`);
    return response.data;
  },

  generateReport: async (params: {
    startDate?: string;
    endDate?: string;
    type?: 'daily' | 'weekly' | 'monthly';
    format?: 'json' | 'csv';
    engineerId?: string;
    includeAchievements?: boolean;
    includeMeetings?: boolean;
  }): Promise<Blob | any> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/report`, {
      params,
      responseType: params.format === 'csv' ? 'blob' : 'json'
    });
    return response.data;
  },

  getMeetingTime: async (engineerId: string): Promise<MeetingTimeMetrics> => {
    const response = await axios.get(`${API_BASE_URL}/monitoring/meeting-time/${engineerId}`);
    return response.data;
  },

  discardIdleTime: async (sessionId: string): Promise<IdleTimeResponse> => {
    const response = await axios.post(`${API_BASE_URL}/monitoring/discard-idle-time`, {
      sessionId
    });
    return response.data;
  }
};
