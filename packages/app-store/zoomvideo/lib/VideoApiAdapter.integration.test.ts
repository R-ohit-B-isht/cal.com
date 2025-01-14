import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockZoomResponses, mockOAuthTokens } from "./__mocks__/zoomApi";
import ZoomVideoApiAdapter from "./VideoApiAdapter";
import { Frequency } from "@calcom/prisma/zod-utils";
import dayjs from "@calcom/dayjs";

describe("ZoomVideoApiAdapter Integration", () => {
  const mockCredential = {
    id: 123,
    userId: 456,
    type: "zoom_video",
    key: mockOAuthTokens.valid,
    appId: "zoom",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("createMeeting", () => {
    it("should successfully create a recurring meeting", async () => {
      const event = {
        title: "Test Recurring Meeting",
        description: "Test Description",
        startTime: "2024-01-15T15:00:00Z",
        endTime: "2024-01-15T16:00:00Z",
        attendees: [{ email: "test@example.com", timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
      };

      // Mock successful API responses
      global.fetch.mockImplementation((url: string) => {
        if (url.includes("/meetings")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockZoomResponses.successfulMeetingCreation),
          });
        }
        if (url.includes("/settings")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockZoomResponses.userSettings),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.createMeeting(event);

      expect(result).toMatchObject({
        type: "zoom_video",
        id: expect.any(String),
        password: expect.any(String),
        url: expect.stringContaining("zoom.us"),
      });
    });

    it("should handle API errors gracefully", async () => {
      const event = {
        title: "Test Meeting",
        startTime: "2024-01-15T15:00:00Z",
        endTime: "2024-01-15T16:00:00Z",
        attendees: [{ email: "test@example.com", timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
      };

      // Mock API error
      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ code: 124, message: "Invalid access token" }),
        })
      );

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await expect(adapter.createMeeting(event)).rejects.toThrow("Unexpected error");
    });
  });

  describe("updateMeeting", () => {
    it("should successfully update a recurring meeting", async () => {
      const event = {
        title: "Updated Recurring Meeting",
        description: "Updated Description",
        startTime: "2024-01-16T15:00:00Z",
        endTime: "2024-01-16T16:00:00Z",
        attendees: [{ email: "test@example.com", timeZone: "UTC" }],
        organizer: { timeZone: "UTC" },
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 5,
          interval: 1,
        },
      };

      const bookingRef = {
        type: "zoom_video",
        uid: "123456789",
      };

      // Mock successful API responses
      global.fetch.mockImplementation((url: string) => {
        if (url.includes("/meetings") && !url.includes("PATCH")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockZoomResponses.successfulMeetingCreation),
          });
        }
        if (url.includes("/settings")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockZoomResponses.userSettings),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = await adapter.updateMeeting(bookingRef, event);

      expect(result).toMatchObject({
        type: "zoom_video",
        id: expect.any(String),
        password: expect.any(String),
        url: expect.stringContaining("zoom.us"),
      });
    });
  });

  describe("deleteMeeting", () => {
    it("should successfully delete a meeting", async () => {
      // Mock successful API response
      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await expect(adapter.deleteMeeting("123456789")).resolves.toBeUndefined();
    });

    it("should handle deletion errors", async () => {
      // Mock API error
      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ code: 3001, message: "Meeting not found" }),
        })
      );

      const adapter = ZoomVideoApiAdapter(mockCredential);
      await expect(adapter.deleteMeeting("123456789")).rejects.toThrow("Failed to delete meeting");
    });
  });
});
