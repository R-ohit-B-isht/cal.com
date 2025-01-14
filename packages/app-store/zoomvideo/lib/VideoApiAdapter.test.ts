import { describe, expect, it, vi, beforeEach } from "vitest";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import ZoomVideoApiAdapter from "./VideoApiAdapter";

describe("ZoomVideoApiAdapter", () => {
  describe("getRecurrence", () => {
    let mockCredential: CredentialPayload;
    let mockCalendarEvent: CalendarEvent;

    beforeEach(() => {
      mockCredential = {
        id: 1,
        type: "zoom_video",
        key: {},
        userId: 1,
        appId: "zoom",
        invalid: false,
      };

      mockCalendarEvent = {
        type: "zoom_video",
        title: "Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        location: "Zoom",
      };
    });

    it("should return undefined when recurringEvent is not provided", () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);
      expect(result).toBeUndefined();
    });

    it("should handle daily frequency correctly", () => {
      mockCalendarEvent.recurringEvent = {
        freq: Frequency.DAILY,
        count: 5,
        interval: 1,
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);

      expect(result).toEqual({
        recurrence: {
          type: 1,
          repeat_interval: 1,
          end_times: 5,
        },
      });
    });

    it("should handle weekly frequency with timezone", () => {
      mockCalendarEvent.recurringEvent = {
        freq: Frequency.WEEKLY,
        count: 4,
        interval: 2,
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);

      expect(result).toEqual({
        recurrence: {
          type: 2,
          repeat_interval: 2,
          end_times: 4,
          weekly_days: 1, // Assuming the date falls on a Sunday (1)
        },
      });
    });

    it("should handle monthly frequency correctly", () => {
      mockCalendarEvent.recurringEvent = {
        freq: Frequency.MONTHLY,
        until: new Date("2024-12-31T23:59:59Z"),
        interval: 1,
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);

      expect(result).toEqual({
        recurrence: {
          type: 3,
          repeat_interval: 1,
          end_date_time: "2024-12-31T23:59:59.000Z",
          monthly_day: 1, // First day of the month
        },
      });
    });

    it("should return undefined for unsupported frequencies", () => {
      mockCalendarEvent.recurringEvent = {
        freq: "YEARLY" as Frequency,
        count: 5,
        interval: 1,
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);
      expect(result).toBeUndefined();
    });

    it("should handle end_times when count is provided", () => {
      mockCalendarEvent.recurringEvent = {
        freq: Frequency.DAILY,
        count: 10,
        interval: 1,
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);

      expect(result?.recurrence.end_times).toBe(10);
      expect(result?.recurrence.end_date_time).toBeUndefined();
    });

    it("should handle end_date_time when until is provided", () => {
      const untilDate = new Date("2024-12-31T23:59:59Z");
      mockCalendarEvent.recurringEvent = {
        freq: Frequency.DAILY,
        until: untilDate,
        interval: 1,
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter["getRecurrence"](mockCalendarEvent);

      expect(result?.recurrence.end_date_time).toBe(untilDate.toISOString());
      expect(result?.recurrence.end_times).toBeUndefined();
    });
  });

  // Integration tests for the main adapter methods
  describe("createMeeting", () => {
    it("should create a meeting with recurring event settings", async () => {
      const mockCredential: CredentialPayload = {
        id: 1,
        type: "zoom_video",
        key: {},
        userId: 1,
        appId: "zoom",
        invalid: false,
      };

      const mockCalendarEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Recurring Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        location: "Zoom",
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      
      // Mock the fetchZoomApi method
      vi.spyOn(adapter as any, "fetchZoomApi").mockResolvedValue({
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      });

      const result = await adapter.createMeeting(mockCalendarEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123456789",
        password: "password123",
        url: "https://zoom.us/j/123456789",
      });
    });

    it("should handle API errors gracefully", async () => {
      const mockCredential: CredentialPayload = {
        id: 1,
        type: "zoom_video",
        key: {},
        userId: 1,
        appId: "zoom",
        invalid: false,
      };

      const mockCalendarEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        location: "Zoom",
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      
      // Mock API failure
      vi.spyOn(adapter as any, "fetchZoomApi").mockRejectedValue(new Error("API Error"));

      await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });
});
