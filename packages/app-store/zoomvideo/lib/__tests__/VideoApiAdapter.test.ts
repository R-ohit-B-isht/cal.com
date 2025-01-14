import type { TFunction } from "next-i18next";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import VideoApiAdapter from "../VideoApiAdapter";

vi.mock("../getZoomAppKeys", () => ({
  getZoomAppKeys: vi.fn(),
}));

describe("VideoApiAdapter", () => {
  const mockCredential: CredentialPayload = {
    id: 1,
    type: "zoom_video",
    key: {
      access_token: "MOCK_TOKEN_FOR_TESTING",
      refresh_token: "MOCK_REFRESH_FOR_TESTING",
      expires_in: 3600,
    },
    userId: 1,
    appId: "zoom",
    teamId: null,
    invalid: null,
    user: { email: "test@example.com" },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  describe("createMeeting", () => {
    it("should create a zoom meeting successfully", async () => {
      const mockEvent: CalendarEvent = {
        type: "zoom_video",
        title: "Test Meeting",
        description: "Test Description",
        startTime: "2024-01-20T10:00:00Z",
        endTime: "2024-01-20T11:00:00Z",
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

      const mockZoomResponse = {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockZoomResponse),
      });

      const adapter = VideoApiAdapter(mockCredential);
      if (!adapter) throw new Error("Failed to create adapter");
      const result = await adapter.createMeeting(mockEvent);

      expect(result).toEqual({
        type: "zoom_video",
        id: "123456789",
        password: "password123",
        url: "https://zoom.us/j/123456789",
      });
    });

    // Additional test cases will be added for:
    // - Meeting creation with recurring events
    // - Error handling
    // - Token refresh scenarios
  });

  // Additional test suites will be added for:
  // - deleteMeeting
  // - updateMeeting
  // - getAvailability
  // - OAuth token refresh flow
});
