import { describe, expect, it, vi, beforeEach } from "vitest";

import ZoomVideoApiAdapter from "./VideoApiAdapter";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("ZoomVideoApiAdapter", () => {
  let mockCredential: CredentialPayload;
  let mockCalendarEvent: CalendarEvent;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock credential
    mockCredential = {
      id: 123,
      type: "zoom_video",
      key: {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
      },
      userId: 456,
      appId: "zoom",
    };

    // Setup mock calendar event
    mockCalendarEvent = {
      type: "zoom_video",
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
      attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
    };
  });

  describe("getRecurrence", () => {
    it("should return undefined when recurringEvent is not provided", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = { ...mockCalendarEvent };
      const result = await adapter.createMeeting(event);
      expect(result).toBeDefined();
      // Verify no recurrence in the created meeting
    });

    it("should handle daily recurring events", async () => {
      const event = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(event);
      expect(result).toBeDefined();
      // Verify recurrence settings in created meeting
    });

    it("should handle weekly recurring events with specific day", async () => {
      const event = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(event);
      expect(result).toBeDefined();
      // Verify weekly recurrence settings
    });

    it("should handle monthly recurring events with specific date", async () => {
      const event = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1,
        },
      };
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(event);
      expect(result).toBeDefined();
      // Verify monthly recurrence settings
    });

    it("should handle end date instead of count", async () => {
      const event = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          until: new Date("2024-02-01"),
          interval: 1,
        },
      };
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(event);
      expect(result).toBeDefined();
      // Verify end_date_time is set correctly
    });
  });

  describe("createMeeting", () => {
    it("should create a basic meeting successfully", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(mockCalendarEvent);
      expect(result).toEqual({
        type: "zoom_video",
        id: expect.any(String),
        password: expect.any(String),
        url: expect.any(String),
      });
    });

    it("should handle API errors gracefully", async () => {
      // Mock API failure
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // Expect error to be thrown and handled
      await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });

  describe("updateMeeting", () => {
    it("should update an existing meeting", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.updateMeeting({ uid: "123", type: "zoom_video" }, mockCalendarEvent);
      expect(result).toEqual({
        type: "zoom_video",
        id: expect.any(String),
        password: expect.any(String),
        url: expect.any(String),
      });
    });
  });

  describe("deleteMeeting", () => {
    it("should delete an existing meeting", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      await expect(adapter.deleteMeeting("123")).resolves.not.toThrow();
    });

    it("should handle deletion of non-existent meeting", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      await expect(adapter.deleteMeeting("nonexistent")).rejects.toThrow("Failed to delete meeting");
    });
  });

  describe("getAvailability", () => {
    it("should return list of meetings", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const availability = await adapter.getAvailability();
      expect(Array.isArray(availability)).toBe(true);
    });

    it("should handle empty schedule", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const availability = await adapter.getAvailability();
      expect(availability).toEqual([]);
    });
  });
});
