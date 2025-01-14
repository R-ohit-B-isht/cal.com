/// <reference types="vitest" />

/**
 * @file VideoApiAdapter.test.ts
 * @description Test suite for the Zoom Video API Adapter implementation
 * 
 * This test suite covers:
 * 1. Recurrence Functionality
 *    - Daily, weekly, and monthly recurring events
 *    - End date vs count scenarios
 *    - Different interval values
 * 
 * 2. Meeting Management
 *    - Creation with various settings
 *    - Deletion with error handling
 *    - User settings integration
 * 
 * 3. Error Handling & Edge Cases
 *    - Network errors
 *    - Rate limiting
 *    - Invalid responses
 *    - Missing user settings
 * 
 * Mocking Strategy:
 * - Uses __mocks__/zoom-api.ts for API response mocking
 * - Global fetch mocking for API calls
 * - Credential and event mocking in beforeEach hooks
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";
import ZoomVideoApiAdapter from "./VideoApiAdapter";
import { mockZoomApiResponses } from "./__mocks__/zoom-api";

// Mock fetch globally
const globalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  global.fetch = globalFetch;
  vi.clearAllMocks();
});

describe("ZoomVideoApiAdapter", () => {
  let mockCredential: CredentialPayload;
  let mockCalendarEvent: CalendarEvent;

  beforeEach(() => {
    mockCredential = {
      id: 1,
      type: "zoom_video",
      key: {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
      },
      userId: 1,
      appId: "zoom",
    };

    mockCalendarEvent = {
      type: "zoom_video",
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      organizer: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
      attendees: [{ email: "attendee@example.com", name: "Test Attendee", timeZone: "UTC" }],
      location: "Zoom",
    };
  });

  describe("getRecurrence", () => {
    it("should return undefined when recurringEvent is not provided", () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // @ts-ignore - accessing private method for testing
      const result = adapter.translateEvent(mockCalendarEvent);
      expect(result).not.toHaveProperty("recurrence");
    });

    it("should handle daily recurring events", () => {
      const recurringEvent = {
        freq: Frequency.DAILY,
        count: 5,
        interval: 1,
      };

      mockCalendarEvent.recurringEvent = recurringEvent;
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // @ts-ignore - accessing private method for testing
      const result = adapter.translateEvent(mockCalendarEvent);
      
      expect(result).toHaveProperty("recurrence");
      expect(result.recurrence).toEqual({
        type: 1,
        repeat_interval: 1,
        end_times: 5,
      });
    });

    it("should handle weekly recurring events", () => {
      const recurringEvent = {
        freq: Frequency.WEEKLY,
        count: 4,
        interval: 1,
      };

      mockCalendarEvent.recurringEvent = recurringEvent;
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // @ts-ignore - accessing private method for testing
      const result = adapter.translateEvent(mockCalendarEvent);
      
      expect(result).toHaveProperty("recurrence");
      expect(result.recurrence).toMatchObject({
        type: 2,
        repeat_interval: 1,
        end_times: 4,
        weekly_days: expect.any(Number),
      });
    });

    it("should handle monthly recurring events", () => {
      const recurringEvent = {
        freq: Frequency.MONTHLY,
        count: 3,
        interval: 1,
      };

      mockCalendarEvent.recurringEvent = recurringEvent;
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // @ts-ignore - accessing private method for testing
      const result = adapter.translateEvent(mockCalendarEvent);
      
      expect(result).toHaveProperty("recurrence");
      expect(result.recurrence).toMatchObject({
        type: 3,
        repeat_interval: 1,
        end_times: 3,
        monthly_day: expect.any(Number),
      });
    });

    it("should handle end_date_time instead of count", () => {
      const recurringEvent = {
        freq: Frequency.DAILY,
        interval: 1,
        until: new Date("2024-02-01T00:00:00Z"),
      };

      mockCalendarEvent.recurringEvent = recurringEvent;
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // @ts-ignore - accessing private method for testing
      const result = adapter.translateEvent(mockCalendarEvent);
      
      expect(result).toHaveProperty("recurrence");
      expect(result.recurrence).toMatchObject({
        type: 1,
        repeat_interval: 1,
        end_date_time: "2024-02-01T00:00:00.000Z",
      });
    });

    it("should handle different intervals", () => {
      const recurringEvent = {
        freq: Frequency.DAILY,
        count: 3,
        interval: 2, // every 2 days
      };

      mockCalendarEvent.recurringEvent = recurringEvent;
      const adapter = ZoomVideoApiAdapter(mockCredential);
      // @ts-ignore - accessing private method for testing
      const result = adapter.translateEvent(mockCalendarEvent);
      
      expect(result).toHaveProperty("recurrence");
      expect(result.recurrence).toMatchObject({
        type: 1,
        repeat_interval: 2,
        end_times: 3,
      });
    });
  });

  describe("createMeeting", () => {
    it("should create a meeting successfully", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockZoomApiResponses.createMeeting.success),
      } as Response);

      const result = await adapter.createMeeting(mockCalendarEvent);
      
      expect(result).toEqual({
        type: "zoom_video",
        id: mockZoomApiResponses.createMeeting.success.id.toString(),
        password: mockZoomApiResponses.createMeeting.success.password,
        url: mockZoomApiResponses.createMeeting.success.join_url,
      });
    });

    it("should handle token expiration", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockZoomApiResponses.createMeeting.error),
      } as Response);

      await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });

  describe("deleteMeeting", () => {
    it("should delete a meeting successfully", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await expect(adapter.deleteMeeting("123456789")).resolves.not.toThrow();
    });

    it("should handle deletion errors", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ code: 404, message: "Meeting not found" }),
      } as Response);

      await expect(adapter.deleteMeeting("123456789")).rejects.toThrow("Failed to delete meeting");
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle network errors', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.createMeeting(mockCalendarEvent))
        .rejects.toThrow('Unexpected error');
    });

    it('should handle rate limiting', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too many requests' })
      } as Response);

      await expect(adapter.createMeeting(mockCalendarEvent))
        .rejects.toThrow('Unexpected error');
    });

    it('should handle missing user settings', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      const result = await adapter.createMeeting(mockCalendarEvent);
      expect(result).toHaveProperty('password', '');
    });

    it('should handle invalid response format', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      } as Response);

      await expect(adapter.createMeeting(mockCalendarEvent))
        .rejects.toThrow();
    });
  });
});
