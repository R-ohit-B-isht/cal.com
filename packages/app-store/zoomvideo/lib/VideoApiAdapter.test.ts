import { describe, expect, it, vi, beforeEach } from "vitest";
import dayjs from "@calcom/dayjs";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";
import ZoomVideoApiAdapter from "./VideoApiAdapter";

// Mock the fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock successful API response
const mockZoomApiResponse = {
  id: 123456789,
  join_url: "https://zoom.us/j/123456789",
  password: "password123",
};

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
  };

  describe("createMeeting with recurring events", () => {
    let adapter: ReturnType<typeof ZoomVideoApiAdapter>;
    const mockAttendee = { email: "test@example.com", timeZone: "UTC" };
    const baseEvent: CalendarEvent = {
      type: "default",
      title: "Test Meeting",
      description: "Test Description",
      startTime: dayjs().add(1, "day").toDate(),
      endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
      attendees: [mockAttendee],
      language: "en",
    };

    beforeEach(() => {
      adapter = ZoomVideoApiAdapter(mockCredential);
      vi.clearAllMocks();
      
      // Reset fetch mock and set default successful response
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockZoomApiResponse,
      });
    });

    it("should handle daily recurring meetings correctly without type 8", async () => {
      const dailyEvent = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };

      const result = await adapter.createMeeting(dailyEvent);
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalled();
      const lastCallBody = JSON.parse(mockFetch.mock.lastCall[1].body);
      
      // Verify recurrence object doesn't include type 8
      expect(lastCallBody.recurrence).toBeDefined();
      expect(lastCallBody.recurrence.type).toBe(1); // Daily
      expect(lastCallBody.type).toBe(2); // Regular scheduled meeting
      
      // Verify response
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });

    it("should handle weekly recurring meetings correctly without type 8", async () => {
      const weeklyEvent = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };

      const result = await adapter.createMeeting(weeklyEvent);
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalled();
      const lastCallBody = JSON.parse(mockFetch.mock.lastCall[1].body);
      
      // Verify recurrence object doesn't include type 8
      expect(lastCallBody.recurrence).toBeDefined();
      expect(lastCallBody.recurrence.type).toBe(2); // Weekly
      expect(lastCallBody.type).toBe(2); // Regular scheduled meeting
      expect(lastCallBody.recurrence.weekly_days).toBeDefined();
      
      // Verify response
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });

    it("should handle monthly recurring meetings correctly without type 8", async () => {
      const monthlyEvent = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1,
        },
      };

      const result = await adapter.createMeeting(monthlyEvent);
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalled();
      const lastCallBody = JSON.parse(mockFetch.mock.lastCall[1].body);
      
      // Verify recurrence object doesn't include type 8
      expect(lastCallBody.recurrence).toBeDefined();
      expect(lastCallBody.recurrence.type).toBe(3); // Monthly
      expect(lastCallBody.type).toBe(2); // Regular scheduled meeting
      expect(lastCallBody.recurrence.monthly_day).toBeDefined();
      
      // Verify response
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });

    it("should handle recurring meetings with end date correctly without type 8", async () => {
      const eventWithEndDate = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          until: dayjs().add(10, "days").toDate(),
          interval: 1,
        },
      };

      const result = await adapter.createMeeting(eventWithEndDate);
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalled();
      const lastCallBody = JSON.parse(mockFetch.mock.lastCall[1].body);
      
      // Verify recurrence object doesn't include type 8
      expect(lastCallBody.recurrence).toBeDefined();
      expect(lastCallBody.recurrence.type).toBe(1); // Daily
      expect(lastCallBody.type).toBe(2); // Regular scheduled meeting
      expect(lastCallBody.recurrence.end_date_time).toBeDefined();
      expect(lastCallBody.recurrence.end_times).toBeUndefined();
      
      // Verify response
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });

    it("should handle unsupported recurring frequencies correctly", async () => {
      const yearlyEvent = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.YEARLY,
          count: 2,
          interval: 1,
        },
      };

      const result = await adapter.createMeeting(yearlyEvent);
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalled();
      const lastCallBody = JSON.parse(mockFetch.mock.lastCall[1].body);
      
      // Verify no recurrence object for unsupported frequency
      expect(lastCallBody.recurrence).toBeUndefined();
      expect(lastCallBody.type).toBe(2); // Regular scheduled meeting
      
      // Verify response
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });

    it("should handle non-recurring meetings correctly", async () => {
      const result = await adapter.createMeeting(baseEvent);
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalled();
      const lastCallBody = JSON.parse(mockFetch.mock.lastCall[1].body);
      
      // Verify no recurrence object for non-recurring meetings
      expect(lastCallBody.recurrence).toBeUndefined();
      expect(lastCallBody.type).toBe(2); // Regular scheduled meeting
      
      // Verify response
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });

    it("should handle API errors gracefully", async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 124, message: "Invalid token" }),
      });

      const dailyEvent = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };

      await expect(adapter.createMeeting(dailyEvent)).rejects.toThrow("Unexpected error");
    });

    it("should handle token refresh scenario", async () => {
      // Mock initial token expired response
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ code: 124, message: "Access token expired" }),
        })
        // Mock token refresh response
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "new_token", refresh_token: "new_refresh" }),
        })
        // Mock successful API call with new token
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockZoomApiResponse,
        });

      const result = await adapter.createMeeting(baseEvent);
      
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponse.id.toString(),
        password: mockZoomApiResponse.password,
        url: mockZoomApiResponse.join_url,
      });
    });
  });
});
