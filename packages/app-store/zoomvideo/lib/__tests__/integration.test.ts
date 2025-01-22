import type { TFunction } from "next-i18next";
import { describe, expect, it, vi, beforeEach } from "vitest";

import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import ZoomVideoApiAdapter from "../VideoApiAdapter";

describe("Zoom Video Integration", () => {
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
    title: "Integration Test Meeting",
    description: "Test Description",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 30 * 60000).toISOString(),
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
  });

  describe("Token Refresh Flow", () => {
    it("should handle token refresh when access token expires", async () => {
      // First call with expired token
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Access token expired" }),
        })
        // Token refresh call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              access_token: "new_access_token",
              refresh_token: "new_refresh_token",
              expires_in: 3599,
            }),
        })
        // Retry original request with new token
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 123456789,
              join_url: "https://zoom.us/j/123456789",
              password: "password123",
            }),
        });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      const result = await zoomApi.createMeeting(mockCalendarEvent);

      expect(result).toHaveProperty("id", "123456789");
      expect(prisma.credential.update).toHaveBeenCalled();
    });
  });

  describe("Network Error Handling", () => {
    it("should handle network timeouts gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network timeout"));

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      await expect(zoomApi.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });

    it("should handle rate limiting", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: "Too many requests" }),
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;
      await expect(zoomApi.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });

  describe("End-to-End Meeting Lifecycle", () => {
    it("should handle complete meeting lifecycle", async () => {
      const meetingId = "123456789";
      const mockMeeting = {
        id: parseInt(meetingId),
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      // Create meeting
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMeeting),
      });

      // Update meeting
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMeeting),
        });

      // Delete meeting
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const zoomApi = ZoomVideoApiAdapter(mockCredential)!;

      // Create
      const createdMeeting = await zoomApi.createMeeting(mockCalendarEvent);
      expect(createdMeeting).toHaveProperty("id", meetingId);

      // Update
      const updatedMeeting = await zoomApi.updateMeeting(
        { uid: meetingId, type: "zoom_video" },
        { ...mockCalendarEvent, title: "Updated Meeting" }
      );
      expect(updatedMeeting).toHaveProperty("id", meetingId);

      // Delete
      await expect(zoomApi.deleteMeeting(meetingId)).resolves.toBeUndefined();
    });
  });
});
