import { describe, expect, it, vi, beforeEach } from "vitest";

import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import ZoomVideoApiAdapter from "./VideoApiAdapter";

describe("ZoomVideoApiAdapter", () => {
  const mockCredential: CredentialPayload = {
    id: 123,
    type: "zoom_video",
    key: {
      access_token: "mock_access_token",
      refresh_token: "mock_refresh_token",
    },
    userId: 456,
    appId: "zoom",
    invalid: false,
    teamId: null,
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

  let adapter: ReturnType<typeof ZoomVideoApiAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = ZoomVideoApiAdapter(mockCredential);
  });

  describe("getRecurrence", () => {
    it("should handle daily recurring events", async () => {
      const event: CalendarEvent = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };

      const result = await adapter["translateEvent"](event);
      expect(result.recurrence).toBeDefined();
      expect(result.recurrence.type).toBe(1);
      expect(result.recurrence.end_times).toBe(5);
      expect(result.recurrence.repeat_interval).toBe(1);
    });

    it("should handle weekly recurring events", async () => {
      const event: CalendarEvent = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };

      const result = await adapter["translateEvent"](event);
      expect(result.recurrence).toBeDefined();
      expect(result.recurrence.type).toBe(2);
      expect(result.recurrence.weekly_days).toBeDefined();
    });

    it("should handle monthly recurring events", async () => {
      const event: CalendarEvent = {
        ...mockCalendarEvent,
        recurringEvent: {
          freq: Frequency.MONTHLY,
          until: new Date("2024-12-31T23:59:59Z"),
          interval: 1,
        },
      };

      const result = await adapter["translateEvent"](event);
      expect(result.recurrence).toBeDefined();
      expect(result.recurrence.type).toBe(3);
      expect(result.recurrence.end_date_time).toBeDefined();
      expect(result.recurrence.monthly_day).toBeDefined();
    });

    it("should handle undefined recurringEvent", async () => {
      const event: CalendarEvent = { ...mockCalendarEvent };
      const result = await adapter["translateEvent"](event);
      expect(result.recurrence).toBeUndefined();
    });
  });

  describe("createMeeting", () => {
    it("should create a meeting successfully", async () => {
      const mockResponse = {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
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
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("API Error"));
      await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });

  describe("updateMeeting", () => {
    it("should update a meeting successfully", async () => {
      const mockResponse = {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse) });

      const result = await adapter.updateMeeting({ uid: "123456789", type: "zoom_video" }, mockCalendarEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123456789",
        password: "password123",
        url: "https://zoom.us/j/123456789",
      });
    });
  });

  describe("deleteMeeting", () => {
    it("should delete a meeting successfully", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(adapter.deleteMeeting("123456789")).resolves.toBeUndefined();
    });

    it("should handle deletion errors", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Delete Error"));
      await expect(adapter.deleteMeeting("123456789")).rejects.toThrow("Failed to delete meeting");
    });
  });
});
