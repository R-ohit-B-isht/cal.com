import { describe, expect, it } from "vitest";

import { TokenStatus } from "@calcom/app-store/_utils/oauth/tokenManager";

import { VideoApiAdapter } from "./VideoApiAdapter";
import { createResponse } from "./test/setup";

describe("VideoApiAdapter", () => {
  const mockFetchZoomApi = async (url: string, _options?: Record<string, unknown>): Promise<unknown> => {
    if (url.includes("/users/me/settings")) {
      return createResponse({
        feature: {
          meeting_capacity: 100,
        },
      });
    }
    return createResponse({});
  };

  const adapter = new VideoApiAdapter({
    fetchZoomApi: mockFetchZoomApi,
  });

  describe("getAvailability", () => {
    it("should return availability with valid token", async () => {
      const availability = await adapter.getAvailability();
      expect(availability).toEqual({
        capacity: 100,
      });
    });

    it("should handle invalid token", async () => {
      const mockFetchWithInvalidToken = async () => ({
        tokenStatus: TokenStatus.INVALID,
        response: new Response(),
      });

      const adapterWithInvalidToken = new VideoApiAdapter({
        fetchZoomApi: mockFetchWithInvalidToken,
      });

      await expect(adapterWithInvalidToken.getAvailability()).rejects.toThrow("Invalid token status");
    });
  });

  describe("createMeeting", () => {
    it("should create a meeting successfully", async () => {
      await adapter.createMeeting({
        title: "Test Meeting",
        description: "Test Description",
        startTime: new Date(),
        endTime: new Date(),
        attendees: [],
        organizer: {
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
          language: { locale: "en" },
        },
      });
    });
  });

  describe("updateMeeting", () => {
    it("should update a meeting successfully", async () => {
      await adapter.updateMeeting("123", {
        title: "Updated Meeting",
        description: "Updated Description",
        startTime: new Date(),
        endTime: new Date(),
        attendees: [],
        organizer: {
          email: "test@example.com",
          name: "Test User",
          timeZone: "UTC",
          language: { locale: "en" },
        },
      });
    });
  });

  describe("deleteMeeting", () => {
    it("should delete a meeting successfully", async () => {
      await adapter.deleteMeeting("123");
    });
  });
});
