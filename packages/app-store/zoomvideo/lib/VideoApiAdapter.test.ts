import { expect, test, vi, describe, beforeEach } from "vitest";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { internalServerErrorResponse, successResponse } from "../../_utils/testUtils";
import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";
import VideoApiAdapter from "./VideoApiAdapter";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

const URLS = {
  CREATE_MEETING: {
    url: "https://api.zoom.us/v2/users/me/meetings",
    method: "POST",
  },
  UPDATE_MEETING: {
    url: "https://api.zoom.us/v2/meetings",
    method: "PATCH",
  },
  DELETE_MEETING: {
    url: "https://api.zoom.us/v2/meetings",
    method: "DELETE",
  },
  GET_MEETINGS: {
    url: "https://api.zoom.us/v2/users/me/meetings",
    method: "GET",
  },
};

// Mock response utilities for Zoom API
const mockZoomSuccessResponse = (data: any) =>
  successResponse({
    json: {
      ...data,
    },
  });

const mockZoomErrorResponse = (status = 500, message = "Internal Server Error") =>
  internalServerErrorResponse({
    json: {
      code: status,
      message,
    },
  });

// Mock meeting data
const mockZoomMeeting = {
  id: 123456789,
  join_url: "https://zoom.us/j/123456789",
  password: "password123",
};

const mockZoomMeetingsList = {
  page_count: 1,
  page_number: 1,
  page_size: 30,
  total_records: 2,
  meetings: [
    {
      id: 123456789,
      topic: "Test Meeting 1",
      start_time: "2023-10-15T10:00:00Z",
      duration: 60,
      join_url: "https://zoom.us/j/123456789",
    },
    {
      id: 987654321,
      topic: "Test Meeting 2",
      start_time: "2023-10-15T14:00:00Z",
      duration: 30,
      join_url: "https://zoom.us/j/987654321",
    },
  ],
};

const mockRequestRaw = vi.fn();
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => {
    return { request: mockRequestRaw };
  }),
}));

// Mock getParsedAppKeysFromSlug
vi.mock("../../_utils/getParsedAppKeysFromSlug", () => ({
  default: vi.fn().mockImplementation(() => ({
    client_id: "FAKE_CLIENT_ID",
    client_secret: "FAKE_CLIENT_SECRET",
  })),
}));

const testCredential = {
  appId: "zoom_video",
  id: 1,
  invalid: false,
  key: {
    scope: "meeting:write meeting:read",
    token_type: "Bearer",
    expiry_date: 1625097600000,
    access_token: "MOCK_ACCESS_TOKEN",
    refresh_token: "MOCK_REFRESH_TOKEN",
  },
  type: "zoom_video",
  userId: 1,
  user: { email: "mock.user@example.com" },
  teamId: 1,
};

// Mock event data
const mockCalendarEvent: CalendarEvent = {
  type: "default",
  title: "Test Meeting",
  description: "Test Description",
  startTime: new Date("2023-10-15T10:00:00Z"),
  endTime: new Date("2023-10-15T11:00:00Z"),
  organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
  attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
};

const mockRecurringEvent: CalendarEvent = {
  ...mockCalendarEvent,
  recurringEvent: {
    freq: Frequency.DAILY,
    count: 5,
    interval: 1,
  },
};

describe("ZoomVideoAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("getAvailability", () => {
    test("gets availability successfully", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeetingsList));

      const availability = await videoApi.getAvailability();

      expect(availability).toHaveLength(2);
      expect(availability[0]).toEqual({
        start: "2023-10-15T10:00:00Z",
        end: "2023-10-15T11:00:00Z",
      });
      expect(availability[1]).toEqual({
        start: "2023-10-15T14:00:00Z",
        end: "2023-10-15T14:30:00Z",
      });
    });

    test("returns empty array on error", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockRejectedValueOnce(new Error("API Error"));

      const availability = await videoApi.getAvailability();

      expect(availability).toEqual([]);
    });
  });

  describe("createMeeting", () => {
    test("creates a meeting successfully", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting));

      const result = await videoApi.createMeeting(mockCalendarEvent);

      expect(mockRequestRaw).toHaveBeenCalledWith({
        url: URLS.CREATE_MEETING.url,
        options: {
          method: "POST",
          body: expect.any(String),
        },
      });

      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomMeeting.id.toString(),
        password: mockZoomMeeting.password,
        url: mockZoomMeeting.join_url,
      });
    });

    test("throws error on API failure", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomErrorResponse());

      await expect(videoApi.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });

    test("throws error when response is missing required fields", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse({ id: 123456789 })); // Missing join_url

      await expect(videoApi.createMeeting(mockCalendarEvent)).rejects.toThrow("Failed to create meeting");
    });
  });

  describe("updateMeeting", () => {
    test("updates a meeting successfully", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw
        .mockResolvedValueOnce(mockZoomSuccessResponse({})) // PATCH response
        .mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting)); // GET updated meeting

      const result = await videoApi.updateMeeting({ uid: "123456789" }, mockCalendarEvent);

      expect(mockRequestRaw).toHaveBeenCalledWith({
        url: expect.stringContaining("/meetings/123456789"),
        options: {
          method: "PATCH",
          body: expect.any(String),
        },
      });

      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomMeeting.id.toString(),
        password: mockZoomMeeting.password,
        url: mockZoomMeeting.join_url,
      });
    });

    test("throws error on API failure", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomErrorResponse());

      await expect(videoApi.updateMeeting({ uid: "123456789" }, mockCalendarEvent)).rejects.toThrow(
        "Failed to update meeting"
      );
    });
  });

  describe("deleteMeeting", () => {
    test("deletes a meeting successfully", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse({}));

      await expect(videoApi.deleteMeeting("123456789")).resolves.not.toThrow();
    });

    test("throws error on API failure", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomErrorResponse());

      await expect(videoApi.deleteMeeting("123456789")).rejects.toThrow("Failed to delete meeting");
    });
  });

  describe("recurring meeting handling", () => {
    test("handles daily recurring meeting correctly without type 8", async () => {
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting));

      await videoApi.createMeeting(mockRecurringEvent);

      expect(mockRequestRaw).toHaveBeenCalledWith({
        url: URLS.CREATE_MEETING.url,
        options: {
          method: "POST",
          body: expect.stringContaining('"recurrence":{"type":1,"repeat_interval":1,"end_times":5}'),
        },
      });
      // Verify type: 8 is not present
      expect(mockRequestRaw.mock.calls[0][0].options.body).not.toContain('"type":8');
    });

    test("handles weekly recurring meeting correctly", async () => {
      const weeklyEvent = {
        ...mockRecurringEvent,
        recurringEvent: {
          ...mockRecurringEvent.recurringEvent,
          freq: Frequency.WEEKLY,
        },
      };

      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting));

      await videoApi.createMeeting(weeklyEvent);

      expect(mockRequestRaw).toHaveBeenCalledWith({
        url: URLS.CREATE_MEETING.url,
        options: {
          method: "POST",
          body: expect.stringContaining('"recurrence":{"type":2,"weekly_days":'),
        },
      });
      expect(mockRequestRaw.mock.calls[0][0].options.body).not.toContain('"type":8');
    });

    test("handles monthly recurring meeting correctly", async () => {
      const monthlyEvent = {
        ...mockRecurringEvent,
        recurringEvent: {
          ...mockRecurringEvent.recurringEvent,
          freq: Frequency.MONTHLY,
        },
      };

      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting));

      await videoApi.createMeeting(monthlyEvent);

      expect(mockRequestRaw).toHaveBeenCalledWith({
        url: URLS.CREATE_MEETING.url,
        options: {
          method: "POST",
          body: expect.stringContaining('"recurrence":{"type":3,"monthly_day":'),
        },
      });
      expect(mockRequestRaw.mock.calls[0][0].options.body).not.toContain('"type":8');
    });

    test("handles undefined recurringEvent correctly", async () => {
      const nonRecurringEvent = { ...mockCalendarEvent };
      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting));

      await videoApi.createMeeting(nonRecurringEvent);

      const requestBody = JSON.parse(mockRequestRaw.mock.calls[0][0].options.body);
      expect(requestBody).not.toHaveProperty('recurrence');
      expect(requestBody).not.toHaveProperty('type', 8);
    });

    test("handles unsupported frequency (YEARLY) correctly", async () => {
      const yearlyEvent = {
        ...mockRecurringEvent,
        recurringEvent: {
          ...mockRecurringEvent.recurringEvent,
          freq: "YEARLY",
        },
      };

      const videoApi = VideoApiAdapter(testCredential);
      mockRequestRaw.mockResolvedValueOnce(mockZoomSuccessResponse(mockZoomMeeting));

      await videoApi.createMeeting(yearlyEvent);

      const requestBody = JSON.parse(mockRequestRaw.mock.calls[0][0].options.body);
      expect(requestBody).not.toHaveProperty('recurrence');
      expect(requestBody).not.toHaveProperty('type', 8);
    });
  });
});
