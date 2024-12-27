import { describe, it, expect, vi, beforeEach } from "vitest";

import { Frequency } from "@calcom/prisma/zod-utils";
import type { CredentialPayload } from "@calcom/types/Credential";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import VideoApiAdapter from "./VideoApiAdapter";

vi.mock("../../_utils/oauth/OAuthManager");

beforeEach(() => {
  vi.resetAllMocks();
});

// Mock the external dependencies
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockImplementation(async ({ url, options }) => {
      // Different responses based on the endpoint
      if (url.includes("users/me/meetings") && options?.method === "GET") {
        return {
          json: {
            meetings: [
              {
                id: 123456,
                start_time: "2024-01-01T10:00:00Z",
                duration: 60,
                join_url: "https://zoom.us/j/123456",
              },
            ],
            page_count: 1,
            page_number: 1,
            page_size: 30,
            total_records: 1,
          },
        };
      }
      if (url.includes("meetings") && options?.method === "POST") {
        return {
          json: {
            id: 123456,
            join_url: "https://zoom.us/j/123456",
            password: "abc123",
          },
        };
      }
      if (url.includes("meetings") && options?.method === "PATCH") {
        return {
          json: {
            id: 123456,
            join_url: "https://zoom.us/j/123456",
            password: "abc123",
          },
        };
      }
      if (url.includes("meetings") && options?.method === "DELETE") {
        return { json: {} };
      }
      if (url.includes("users/me/settings")) {
        return {
          json: {
            recording: { auto_recording: "none" },
            schedule_meeting: { default_password_for_scheduled_meetings: "abc123" },
          },
        };
      }
      throw new Error(`Unhandled request: ${url} ${options?.method}`);
    }),
  })),
}));

vi.mock("./getZoomAppKeys", () => ({
  getZoomAppKeys: vi.fn().mockResolvedValue({
    client_id: "MOCK_CLIENT_ID",
    client_secret: "MOCK_CLIENT_SECRET",
  }),
}));

const MOCK_CREDENTIAL_PAYLOAD: CredentialPayload = {
  id: 1,
  type: "zoom_video",
  key: {
    scope: "meeting:write meeting:read",
    token_type: "Bearer",
    access_token: "MOCK_ACCESS_TOKEN",
    refresh_token: "MOCK_REFRESH_TOKEN",
    expires_in: 3599,
  },
  userId: 1,
  appId: "zoom",
  invalid: false,
  teamId: null,
};

describe("ZoomVideoApiAdapter", () => {
  describe("createMeeting", () => {
    it("creates a meeting successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const result = await videoApi.createMeeting(event);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123456",
        password: "abc123",
        url: "https://zoom.us/j/123456",
      });
    });

    it("handles recurring meeting creation", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Recurring Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };

      const result = await videoApi.createMeeting(event);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123456",
        password: "abc123",
        url: "https://zoom.us/j/123456",
      });
    });

    it("handles API errors gracefully", async () => {
      (OAuthManager as jest.Mock).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Unexpected error");
    });

    it("handles expired token", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue({
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Access token expired" }),
        }),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Test Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Unexpected error");
    });
  });

  describe("getAvailability", () => {
    it("retrieves availability successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const result = await videoApi.getAvailability();

      expect(result).toEqual([
        {
          start: "2024-01-01T10:00:00Z",
          end: "2024-01-01T11:00:00Z",
        },
      ]);
    });

    it("returns empty array when token is expired", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue({
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Access token expired" }),
        }),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const result = await videoApi.getAvailability();

      expect(result).toEqual([]);
    });

    it("returns empty array on API error", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const result = await videoApi.getAvailability();

      expect(result).toEqual([]);
    });
  });

  describe("deleteMeeting", () => {
    it("deletes a meeting successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      await expect(videoApi.deleteMeeting("123456")).resolves.not.toThrow();
    });

    it("handles API errors gracefully", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      await expect(videoApi.deleteMeeting("123456")).rejects.toThrow("Failed to delete meeting");
    });

    it("handles expired token", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue({
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Access token expired" }),
        }),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      await expect(videoApi.deleteMeeting("123456")).rejects.toThrow("Failed to delete meeting");
    });
  });

  describe("updateMeeting", () => {
    it("updates a meeting successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Updated Test Meeting",
        description: "Updated Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
      };

      const result = await videoApi.updateMeeting(bookingRef, event);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123456",
        password: "abc123",
        url: "https://zoom.us/j/123456",
      });
    });

    it("handles API errors gracefully", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Updated Test Meeting",
        description: "Updated Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
      };

      await expect(videoApi.updateMeeting(bookingRef, event)).rejects.toThrow("Failed to update meeting");
    });

    it("handles expired token", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue({
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Access token expired" }),
        }),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Updated Test Meeting",
        description: "Updated Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
      };

      await expect(videoApi.updateMeeting(bookingRef, event)).rejects.toThrow("Failed to update meeting");
    });
  });

  describe("recurring meeting edge cases", () => {
    it("handles daily recurring meetings", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Daily Recurring Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
      };

      const result = await videoApi.createMeeting(event);
      expect(result).toEqual({
        type: "zoom_video",
        id: "123456",
        password: "abc123",
        url: "https://zoom.us/j/123456",
      });
    });

    it("handles weekly recurring meetings", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Weekly Recurring Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };

      const result = await videoApi.createMeeting(event);
      expect(result).toEqual({
        type: "zoom_video",
        id: "123456",
        password: "abc123",
        url: "https://zoom.us/j/123456",
      });
    });

    it("handles monthly recurring meetings", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Monthly Recurring Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1,
        },
      };

      const result = await videoApi.createMeeting(event);
      expect(result).toEqual({
        type: "zoom_video",
        id: "123456",
        password: "abc123",
        url: "https://zoom.us/j/123456",
      });
    });

    it("rejects unsupported yearly frequency", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Yearly Recurring Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: "YEARLY",
          count: 2,
          interval: 1,
        },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Unsupported recurring event frequency");
    });
  });
});
