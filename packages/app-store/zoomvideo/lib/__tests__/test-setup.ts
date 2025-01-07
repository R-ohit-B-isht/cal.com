import { vi } from 'vitest';
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoCallData } from "@calcom/core/videoClient";

// Mock types for testing
declare global {
  namespace Vi {
    interface Assertion {
      toHaveBeenCalledWithZoomMeeting(meeting: Partial<VideoCallData>): void;
    }
  }
}

// Add custom matcher
expect.extend({
  toHaveBeenCalledWithZoomMeeting(received: any, meeting: Partial<VideoCallData>) {
    const pass = received.mock.calls.some((call: any[]) => {
      const requestBody = JSON.parse(call[0].options.body);
      return !requestBody.type || requestBody.type === 2; // Ensure it's not 8
    });

    return {
      pass,
      message: () =>
        `expected request ${pass ? 'not ' : ''}to have been called with a valid Zoom meeting`,
    };
  },
});

// Mock modules
vi.mock("@calcom/dayjs", () => ({
  default: {
    utc: vi.fn(() => ({
      format: vi.fn(),
    })),
    tz: vi.fn(() => ({
      format: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  Frequency: {
    YEARLY: "YEARLY",
    MONTHLY: "MONTHLY",
    WEEKLY: "WEEKLY",
    DAILY: "DAILY",
  },
}));

// Export test utilities
export const createMockCredential = (): CredentialPayload => ({
  id: 1,
  type: "zoom_video",
  key: {},
  userId: 1,
  appId: "zoom",
  invalid: false,
});

export const createMockEvent = (partial?: Partial<CalendarEvent>): CalendarEvent => ({
  startTime: new Date("2024-01-07T10:00:00Z"),
  endTime: new Date("2024-01-07T11:00:00Z"),
  title: "Test Meeting",
  description: "Test Description",
  attendees: [{ email: "test@example.com", timeZone: "UTC" }],
  organizer: { email: "organizer@example.com", timeZone: "UTC" },
  ...partial,
});
