import type { CalendarEvent } from "@calcom/types/Calendar";
import { Frequency } from "@calcom/prisma/zod-utils";
import { expect, test, vi, describe } from "vitest";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { successResponse } from "../../_utils/testUtils";
import VideoApiAdapter from "./VideoApiAdapter";

// Add missing type definitions
type TestEvent = Partial<CalendarEvent> & {
  recurringEvent?: {
    freq: string;
    count?: number;
    interval?: number;
    until?: Date;
  };
  startTime: Date;
  attendees: { timeZone: string }[];
};

// Mock the Zoom API responses
const mockZoomResponses = {
  createMeeting: {
    success: {
      id: 123456789,
      join_url: "https://zoom.us/j/123456789",
      password: "password123",
    },
    error: {
      code: 124,
      message: "Invalid access token",
    },
  },
  userSettings: {
    recording: {
      auto_recording: "none",
    },
    schedule_meeting: {
      default_password_for_scheduled_meetings: "defaultpass",
    },
  },
};

// Mock dependencies
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => {
    return { request: vi.fn() };
  }),
}));

const testCredential = {
  appId: "zoomvideo",
  id: 1,
  invalid: false,
  key: {
    scope: "meeting:write",
    token_type: "Bearer",
    expiry_date: 1625097600000,
    access_token: "test_access_token",
    refresh_token: "test_refresh_token",
  },
  type: "zoom_video",
  userId: 1,
  user: { email: "test@example.com" },
  teamId: 1,
};

// Mock the fetch function
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      update: vi.fn(),
    },
  },
}));

describe("ZoomVideoApiAdapter", () => {
  describe("createMeeting with recurring events", () => {
    const videoApi = VideoApiAdapter(testCredential);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("successfully creates a recurring daily meeting", async () => {
      const mockRequest = vi.fn().mockResolvedValue(
        successResponse({
          json: mockZoomResponses.createMeeting.success,
        })
      );

      vi.mocked(OAuthManager).mockImplementation(() => ({
        request: mockRequest,
      }));

      const event = {
        title: "Daily Team Standup",
        description: "Daily team sync meeting",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:30:00Z"),
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const result = await videoApi.createMeeting(event);

      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomResponses.createMeeting.success.id.toString(),
        password: mockZoomResponses.createMeeting.success.password,
        url: mockZoomResponses.createMeeting.success.join_url,
      });

      expect(mockRequest).toHaveBeenCalledWith({
        url: "https://api.zoom.us/v2/users/me/meetings",
        options: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining('"type":2'),
        },
      });
    });

    test("handles API errors gracefully", async () => {
      const mockRequest = vi.fn().mockRejectedValue(new Error("API Error"));

      vi.mocked(OAuthManager).mockImplementation(() => ({
        request: mockRequest,
      }));

      const event = {
        title: "Test Meeting",
        startTime: new Date(),
        endTime: new Date(),
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Unexpected error");
    });
  });
  describe("getRecurrence", () => {
    const videoApi = VideoApiAdapter(testCredential);

    test("returns undefined when recurringEvent is null", async () => {
      const event = {
        recurringEvent: null,
        startTime: new Date("2024-01-01T10:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
      };
      
      // @ts-ignore - accessing private method for testing
      const result = videoApi.translateEvent(event).getRecurrence(event);
      expect(result).toBeUndefined();
    });

    test("handles DAILY frequency correctly", async () => {
      const event = {
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
        startTime: new Date("2024-01-01T10:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
      };
      
      // @ts-ignore - accessing private method for testing
      const result = videoApi.translateEvent(event).getRecurrence(event);
      expect(result).toEqual({
        recurrence: {
          type: 1,
          repeat_interval: 1,
          end_times: 5,
        },
      });
    });

    test("handles WEEKLY frequency correctly", async () => {
      const event = {
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 2,
        },
        startTime: new Date("2024-01-01T10:00:00Z"), // Monday
        attendees: [{ timeZone: "UTC" }],
      };
      
      // @ts-ignore - accessing private method for testing
      const result = videoApi.translateEvent(event).getRecurrence(event);
      expect(result).toEqual({
        recurrence: {
          type: 2,
          repeat_interval: 2,
          end_times: 4,
          weekly_days: 2, // Monday = 2
        },
      });
    });

    test("handles MONTHLY frequency correctly", async () => {
      const event = {
        recurringEvent: {
          freq: Frequency.MONTHLY,
          until: new Date("2024-06-01T00:00:00Z"),
          interval: 1,
        },
        startTime: new Date("2024-01-15T10:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
      };
      
      // @ts-ignore - accessing private method for testing
      const result = videoApi.translateEvent(event).getRecurrence(event);
      expect(result).toEqual({
        recurrence: {
          type: 3,
          repeat_interval: 1,
          end_date_time: "2024-06-01T00:00:00.000Z",
          monthly_day: 15,
        },
      });
    });

    test("returns undefined for unsupported frequencies", async () => {
      const event = {
        recurringEvent: {
          freq: "YEARLY",
          count: 5,
          interval: 1,
        },
        startTime: new Date("2024-01-01T10:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
      };
      
      // @ts-ignore - accessing private method for testing
      const result = videoApi.translateEvent(event).getRecurrence(event);
      expect(result).toBeUndefined();
    });

    test("handles missing timezone in attendees", async () => {
      const event = {
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
        startTime: new Date("2024-01-01T10:00:00Z"),
        attendees: [],
      };
      
      expect(() => {
        // @ts-ignore - accessing private method for testing
        videoApi.translateEvent(event).getRecurrence(event);
      }).toThrow();
    });
  });

  describe("updateMeeting with recurring events", () => {
    const videoApi = VideoApiAdapter(testCredential);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("successfully updates a recurring meeting", async () => {
      const mockRequest = vi.fn().mockResolvedValue(
        successResponse({
          json: mockZoomResponses.createMeeting.success,
        })
      );

      vi.mocked(OAuthManager).mockImplementation(() => ({
        request: mockRequest,
      }));

      const event = {
        title: "Updated Team Standup",
        description: "Updated team sync meeting",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T11:30:00Z"),
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 10,
          interval: 1,
        },
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456789",
        meetingId: "123456789",
      };

      const result = await videoApi.updateMeeting(bookingRef, event);

      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomResponses.createMeeting.success.id.toString(),
        password: mockZoomResponses.createMeeting.success.password,
        url: mockZoomResponses.createMeeting.success.join_url,
      });

      expect(mockRequest).toHaveBeenCalledWith({
        url: "https://api.zoom.us/v2/meetings/123456789",
        options: {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining('"type":2'),
        },
      });
    });

    test("handles update API errors gracefully", async () => {
      const mockRequest = vi.fn().mockRejectedValue(new Error("API Error"));

      vi.mocked(OAuthManager).mockImplementation(() => ({
        request: mockRequest,
      }));

      const event = {
        title: "Test Meeting",
        startTime: new Date(),
        endTime: new Date(),
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456789",
        meetingId: "123456789",
      };

      await expect(videoApi.updateMeeting(bookingRef, event)).rejects.toThrow("Failed to update meeting");
    });
  });
});
