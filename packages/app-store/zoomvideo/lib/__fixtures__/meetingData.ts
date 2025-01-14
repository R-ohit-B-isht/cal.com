import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

export const mockCredential: CredentialPayload = {
  id: 123,
  type: "zoom_video",
  key: {
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_at: Date.now() + 3600000, // 1 hour from now
  },
  userId: 456,
  appId: "zoom",
};

export const mockCalendarEvent: CalendarEvent = {
  type: "zoom_video",
  title: "Test Meeting",
  description: "Test Description",
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T11:00:00Z"),
  organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
  attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
};

export const mockRecurringEvents = {
  daily: {
    ...mockCalendarEvent,
    recurringEvent: {
      freq: Frequency.DAILY,
      count: 5,
      interval: 1,
    },
  },
  weekly: {
    ...mockCalendarEvent,
    recurringEvent: {
      freq: Frequency.WEEKLY,
      count: 4,
      interval: 1,
    },
  },
  monthly: {
    ...mockCalendarEvent,
    recurringEvent: {
      freq: Frequency.MONTHLY,
      count: 3,
      interval: 1,
    },
  },
  withEndDate: {
    ...mockCalendarEvent,
    recurringEvent: {
      freq: Frequency.DAILY,
      until: new Date("2024-02-01"),
      interval: 1,
    },
  },
};

export const mockErrorScenarios = {
  expiredToken: {
    credential: {
      ...mockCredential,
      key: {
        ...mockCredential.key,
        expires_at: Date.now() - 3600000, // 1 hour ago
      },
    },
  },
  invalidToken: {
    credential: {
      ...mockCredential,
      key: {
        ...mockCredential.key,
        access_token: "invalid_token",
      },
    },
  },
};
