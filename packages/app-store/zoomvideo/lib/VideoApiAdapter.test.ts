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
    it("deletes a non-recurring meeting successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
      };
      await expect(videoApi.deleteMeeting(bookingRef)).resolves.not.toThrow();
    });

    it("deletes a recurring meeting series successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
        recurringEventId: "rec123",
      };
      await expect(videoApi.deleteMeeting(bookingRef)).resolves.not.toThrow();
    });

    it("deletes a specific occurrence from a recurring series", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
        recurringEventId: "rec123",
        occurrenceId: "occ456",
      };
      await expect(videoApi.deleteMeeting(bookingRef)).resolves.not.toThrow();
    });

    it("handles API errors for recurring meeting deletion", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue(new Error("Failed to delete recurring meeting")),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
        recurringEventId: "rec123",
      };
      await expect(videoApi.deleteMeeting(bookingRef)).rejects.toThrow("Failed to delete meeting");
    });

    it("handles non-existent occurrence deletion gracefully", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue({
          status: 404,
          json: () => Promise.resolve({ code: 3001, message: "Meeting occurrence not found" }),
        }),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
        recurringEventId: "rec123",
        occurrenceId: "nonexistent",
      };
      await expect(videoApi.deleteMeeting(bookingRef)).rejects.toThrow("Failed to delete meeting");
    });

    it("handles expired token during recurring meeting deletion", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue({
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Access token expired" }),
        }),
      }));

      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
        recurringEventId: "rec123",
      };
      await expect(videoApi.deleteMeeting(bookingRef)).rejects.toThrow("Failed to delete meeting");
    });
  });

  describe("updateMeeting", () => {
    it("updates a non-recurring meeting successfully", async () => {
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

    it("updates a recurring meeting successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Updated Recurring Meeting",
        description: "Updated Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 5, // Updated from original 3 to 5
          interval: 1,
        },
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

    it("updates recurring meeting frequency successfully", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Updated Recurring Meeting Frequency",
        description: "Updated Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.DAILY, // Changed from WEEKLY to DAILY
          count: 3,
          interval: 1,
        },
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

    it("handles updating a meeting series in progress", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      const event = {
        title: "Update In-Progress Series",
        description: "Test Description",
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 3600000), // 1 hour later
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
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

    it("rejects updating to unsupported frequency", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Invalid Frequency Update",
        description: "Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: "YEARLY", // Unsupported frequency
          count: 2,
          interval: 1,
        },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
      };

      await expect(videoApi.updateMeeting(bookingRef, event)).rejects.toThrow("Unsupported recurring event frequency");
    });

    it("handles API errors during recurring meeting update", async () => {
      (OAuthManager as any).mockImplementationOnce(() => ({
        request: vi.fn().mockRejectedValue(new Error("Failed to update recurring meeting")),
      }));


      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "API Error Test",
        description: "Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 3,
          interval: 1,
        },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456",
        meetingId: "123456",
        meetingPassword: "abc123",
      };

      await expect(videoApi.updateMeeting(bookingRef, event)).rejects.toThrow("Failed to update meeting");
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

  describe("meeting parameter validation", () => {
    it("rejects meeting creation with end time before start time", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Invalid Time Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T10:00:00Z"), // End time before start time
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("End time must be after start time");
    });

    it("rejects meeting creation with missing required fields", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        description: "Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        // Missing title and attendees
        organizer: { timeZone: "UTC" },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Missing required fields");
    });

    it("rejects recurring meeting with invalid interval", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Invalid Interval Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 3,
          interval: 0, // Invalid interval
        },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Invalid recurring event interval");
    });

    it("rejects recurring meeting with invalid count", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Invalid Count Meeting",
        description: "Test Description",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T12:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 0, // Invalid count
          interval: 1,
        },
      };

      await expect(videoApi.createMeeting(event)).rejects.toThrow("Invalid recurring event count");
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

    it("handles daily recurring meetings with interval > 1", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Daily Recurring Meeting Every 2 Days",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 3,
          interval: 2, // Every 2 days
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

    it("handles weekly recurring meetings with interval > 1", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Weekly Recurring Meeting Every 2 Weeks",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 3,
          interval: 2, // Every 2 weeks
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

    it("handles monthly recurring meetings with interval > 1", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Monthly Recurring Meeting Every 2 Months",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 2, // Every 2 months
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

    it("handles recurring meetings with end date instead of count", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Daily Recurring Meeting with End Date",
        description: "Test Description",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T11:00:00Z"),
        attendees: [{ timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.DAILY,
          interval: 1,
          until: new Date("2024-01-05T23:59:59Z"), // End date instead of count
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

    it("handles meetings with different time zones between organizer and attendee", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Meeting with Different Time Zones",
        description: "Test Description",
        startTime: new Date("2024-01-01T15:00:00Z"), // 10:00 AM EST
        endTime: new Date("2024-01-01T16:00:00Z"),   // 11:00 AM EST
        attendees: [{ timeZone: "America/New_York" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
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

    it("handles meetings crossing daylight saving time boundaries", async () => {
      const videoApi = VideoApiAdapter(MOCK_CREDENTIAL_PAYLOAD);
      const event = {
        title: "Meeting Crossing DST",
        description: "Test Description",
        startTime: new Date("2024-03-09T15:00:00Z"), // Before US DST change
        endTime: new Date("2024-03-09T16:00:00Z"),
        attendees: [{ timeZone: "America/New_York" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
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
  });
});
