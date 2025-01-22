import type { TFunction } from "next-i18next";
import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import ZoomVideoApiAdapter from "../VideoApiAdapter";
import { getZoomAppKeys } from "../getZoomAppKeys";

// Mock external dependencies
vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      update: vi.fn(),
    },
  },
}));

vi.mock("../getZoomAppKeys", () => ({
  getZoomAppKeys: vi.fn(),
}));

describe("ZoomVideoApiAdapter", () => {
  const mockCredential: CredentialPayload = {
    id: 123,
    type: "zoom_video",
    key: {
      access_token: "mock_access_token",
      refresh_token: "mock_refresh_token",
      expires_in: 3599,
    },
    userId: 456,
    appId: "zoom",
    teamId: null,
    invalid: false,
    user: {
      email: "test@example.com",
    },
  };

  const mockCalendarEvent: CalendarEvent = {
    type: "zoom_video",
    title: "Test Meeting",
    description: "Test Description",
    startTime: dayjs().add(1, "day").toISOString(),
    endTime: dayjs().add(1, "day").add(30, "minute").toISOString(),
    organizer: {
      email: "test@example.com",
      name: "Test User",
      timeZone: "UTC",
      language: { translate: ((key: string) => key) as TFunction, locale: "en" },
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Test Attendee",
        timeZone: "UTC",
        language: { translate: ((key: string) => key) as TFunction, locale: "en" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    (getZoomAppKeys as jest.Mock).mockResolvedValue({
      client_id: "mock_client_id",
      client_secret: "mock_client_secret",
    });
  });

  describe("createMeeting", () => {
    it("should create a meeting successfully", async () => {
      const mockZoomResponse = {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockZoomResponse),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      const result = await zoomApi.createMeeting(mockCalendarEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomResponse.id.toString(),
        password: mockZoomResponse.password,
        url: mockZoomResponse.join_url,
      });
    });

    it("should handle API errors gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Bad Request" }),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      await expect(zoomApi.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });

  describe("updateMeeting", () => {
    it("should update a meeting successfully", async () => {
      const mockZoomResponse = {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockZoomResponse),
        });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      const result = await zoomApi.updateMeeting({ uid: "123456789", type: "zoom_video" }, mockCalendarEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomResponse.id.toString(),
        password: mockZoomResponse.password,
        url: mockZoomResponse.join_url,
      });
    });
  });

  describe("deleteMeeting", () => {
    it("should delete a meeting successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      await expect(zoomApi.deleteMeeting("123456789")).resolves.toBeUndefined();
    });

    it("should handle deletion errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not Found" }),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      await expect(zoomApi.deleteMeeting("123456789")).rejects.toThrow("Failed to delete meeting");
    });
  });

  describe("getAvailability", () => {
    it("should fetch availability successfully", async () => {
      const mockMeetings = {
        meetings: [
          {
            id: 123456789,
            start_time: "2024-01-23T10:00:00Z",
            duration: 30,
          },
        ],
        page_count: 1,
        page_number: 1,
        page_size: 30,
        total_records: 1,
        next_page_token: "",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMeetings),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      const availability = await zoomApi.getAvailability();

      expect(availability).toHaveLength(1);
      expect(availability[0]).toHaveProperty("start");
      expect(availability[0]).toHaveProperty("end");
    });
  });

  describe("recurring meetings", () => {
    const recurringEvent = {
      ...mockCalendarEvent,
      recurringEvent: {
        freq: Frequency.WEEKLY,
        count: 4,
        interval: 1,
      },
    };

    it("should create a recurring meeting with correct parameters", async () => {
      const mockZoomResponse = {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockZoomResponse),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      await zoomApi.createMeeting(recurringEvent);

      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const lastCallBody = JSON.parse(fetchCalls[fetchCalls.length - 1][1].body);

      expect(lastCallBody).toHaveProperty("type", 8); // Recurring meeting type
      expect(lastCallBody.recurrence).toHaveProperty("type", 2); // Weekly recurrence
      expect(lastCallBody.recurrence).toHaveProperty("end_times", 4);
    });
  });
});
