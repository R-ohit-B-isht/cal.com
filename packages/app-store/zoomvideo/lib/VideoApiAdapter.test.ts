import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import dayjs from "@calcom/dayjs";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";
import ZoomVideoApiAdapter from "./VideoApiAdapter";

describe("ZoomVideoApiAdapter", () => {
  const mockCredential: CredentialPayload = {
    id: 123,
    type: "zoom_video",
    key: {
      access_token: "MOCK_ACCESS_TOKEN",
      refresh_token: "MOCK_REFRESH_TOKEN",
      expires_in: 3599,
    },
    userId: 1,
    appId: "zoom_video",
    invalid: false,
  };

  // Mock the current time for consistent testing
  const mockCurrentTime = new Date("2023-01-01T10:00:00Z");
  
  // Mock fetchZoomApi globally
  const mockFetchZoomApi = vi.fn();
  
  // Mock the auth request function
  vi.mock("../../_utils/oauth/OAuthManager", () => ({
    OAuthManager: vi.fn().mockImplementation(() => ({
      request: async ({ url, options }) => {
        const endpoint = url.split("v2/")[1];
        const response = await mockFetchZoomApi(endpoint, options);
        return { json: response };
      },
    })),
  }));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockCurrentTime);
    mockFetchZoomApi.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("createMeeting with recurring events", () => {
    const mockFetchZoomApi = vi.fn();
    const mockTranslateEvent = vi.fn();

    beforeEach(() => {
      mockFetchZoomApi.mockReset();
      mockTranslateEvent.mockReset();
    });

    it("should create a daily recurring meeting without type:8", async () => {
      const dailyEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Daily Team Standup",
        description: "Daily sync meeting",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T10:30:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };

      // Mock successful API response
      mockFetchZoomApi.mockResolvedValueOnce({
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(dailyEvent);

      // Verify the meeting was created
      expect(result).toEqual({
        type: "zoom_video",
        id: "123456789",
        password: "password123",
        url: "https://zoom.us/j/123456789",
      });

      // Verify the API was called with correct parameters
      expect(mockFetchZoomApi).toHaveBeenCalledWith("users/me/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"type":1'), // Daily recurrence type
      });

      // Verify type:8 is not present in the request
      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody.recurrence).not.toHaveProperty("type", 8);
    });

    it("should create a weekly recurring meeting with correct day", async () => {
      const weeklyEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Weekly Team Meeting",
        description: "Weekly sync meeting",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(), // This is a Sunday
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 987654321,
        join_url: "https://zoom.us/j/987654321",
        password: "password456",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(weeklyEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: "987654321",
        password: "password456",
        url: "https://zoom.us/j/987654321",
      });

      // Verify the API was called with correct parameters
      expect(mockFetchZoomApi).toHaveBeenCalledWith("users/me/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"type":2'), // Weekly recurrence type
      });

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody.recurrence).not.toHaveProperty("type", 8);
      expect(requestBody.recurrence.weekly_days).toBe(1); // Sunday = 1
    });

    it("should create a monthly recurring meeting with correct day", async () => {
      const monthlyEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Monthly Planning",
        description: "Monthly planning meeting",
        startTime: new Date("2023-01-15T14:00:00Z").toISOString(), // 15th of the month
        endTime: new Date("2023-01-15T15:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1,
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 456789123,
        join_url: "https://zoom.us/j/456789123",
        password: "password789",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(monthlyEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: "456789123",
        password: "password789",
        url: "https://zoom.us/j/456789123",
      });

      // Verify the API was called with correct parameters
      expect(mockFetchZoomApi).toHaveBeenCalledWith("users/me/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"type":3'), // Monthly recurrence type
      });

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody.recurrence).not.toHaveProperty("type", 8);
      expect(requestBody.recurrence.monthly_day).toBe(15); // 15th of the month
    });
  });

  describe("createMeeting with non-recurring events", () => {
    const mockFetchZoomApi = vi.fn();

    beforeEach(() => {
      mockFetchZoomApi.mockReset();
    });

    it("should create a non-recurring meeting without recurrence object", async () => {
      const nonRecurringEvent: CalendarEvent = {
        type: "zoom_video",
        title: "One-time Meeting",
        description: "Single occurrence meeting",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 123123123,
        join_url: "https://zoom.us/j/123123123",
        password: "password123",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(nonRecurringEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123123123",
        password: "password123",
        url: "https://zoom.us/j/123123123",
      });

      // Verify the API was called with correct parameters
      expect(mockFetchZoomApi).toHaveBeenCalledWith("users/me/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      });

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody).not.toHaveProperty("recurrence");
      expect(requestBody).not.toHaveProperty("type", 8);
    });
  });

  describe("createMeeting edge cases", () => {
    const mockFetchZoomApi = vi.fn();

    beforeEach(() => {
      mockFetchZoomApi.mockReset();
    });

    it("should handle end_date_time for recurring events with until date", async () => {
      const eventWithUntil: CalendarEvent = {
        type: "zoom_video",
        title: "Recurring with End Date",
        description: "Meeting with end date",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        recurringEvent: {
          freq: Frequency.DAILY,
          interval: 1,
          until: new Date("2023-01-31T23:59:59Z"),
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 111222333,
        join_url: "https://zoom.us/j/111222333",
        password: "password111",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await adapter.createMeeting(eventWithUntil);

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody.recurrence).toHaveProperty("end_date_time", "2023-01-31T23:59:59Z");
      expect(requestBody.recurrence).not.toHaveProperty("end_times");
    });

    it("should handle end_times for recurring events with count", async () => {
      const eventWithCount: CalendarEvent = {
        type: "zoom_video",
        title: "Recurring with Count",
        description: "Meeting with occurrence count",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        recurringEvent: {
          freq: Frequency.DAILY,
          interval: 1,
          count: 10,
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 444555666,
        join_url: "https://zoom.us/j/444555666",
        password: "password444",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await adapter.createMeeting(eventWithCount);

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody.recurrence).toHaveProperty("end_times", 10);
      expect(requestBody.recurrence).not.toHaveProperty("end_date_time");
    });

    it("should return undefined for unsupported yearly frequency", async () => {
      const yearlyEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Yearly Meeting",
        description: "Meeting with yearly recurrence",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
        recurringEvent: {
          freq: "YEARLY",
          interval: 1,
          count: 5,
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 777888999,
        join_url: "https://zoom.us/j/777888999",
        password: "password777",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await adapter.createMeeting(yearlyEvent);

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      expect(requestBody).not.toHaveProperty("recurrence");
    });

    it("should handle API errors gracefully", async () => {
      const event: CalendarEvent = {
        type: "zoom_video",
        title: "Error Test Meeting",
        description: "Meeting to test error handling",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
      };

      mockFetchZoomApi.mockRejectedValueOnce(new Error("API Error"));

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await expect(adapter.createMeeting(event)).rejects.toThrow("Unexpected error");
    });

    it("should handle empty attendees array", async () => {
      const eventNoAttendees: CalendarEvent = {
        type: "zoom_video",
        title: "Meeting Without Attendees",
        description: "Test meeting with no attendees",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [],
        recurringEvent: {
          freq: Frequency.WEEKLY,
          interval: 1,
          count: 4,
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 999000111,
        join_url: "https://zoom.us/j/999000111",
        password: "password999",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await adapter.createMeeting(eventNoAttendees);

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      // Should use organizer's timezone when no attendees are present
      expect(requestBody.timezone).toBe("UTC");
      expect(requestBody.recurrence.weekly_days).toBe(dayjs(eventNoAttendees.startTime).day() + 1);
    });

    it("should handle missing timeZone in attendees", async () => {
      const eventNoTimeZone: CalendarEvent = {
        type: "zoom_video",
        title: "Meeting With Missing TimeZone",
        description: "Test meeting with attendee missing timezone",
        startTime: new Date("2023-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:00:00Z").toISOString(),
        organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
        attendees: [{ email: "attendee@example.com", name: "Test Attendee" }],
        recurringEvent: {
          freq: Frequency.MONTHLY,
          interval: 1,
          count: 3,
        },
      };

      mockFetchZoomApi.mockResolvedValueOnce({
        id: 222333444,
        join_url: "https://zoom.us/j/222333444",
        password: "password222",
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await adapter.createMeeting(eventNoTimeZone);

      const requestBody = JSON.parse(mockFetchZoomApi.mock.calls[0][1].body);
      // Should fallback to organizer's timezone when attendee timezone is missing
      expect(requestBody.timezone).toBe("UTC");
      expect(requestBody.recurrence.monthly_day).toBe(dayjs(eventNoTimeZone.startTime).date());
    });
  });
});
