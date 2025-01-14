import { describe, expect, it, vi, beforeEach } from "vitest";

import ZoomVideoApiAdapter from "./VideoApiAdapter";
import { mockCalendarEvent, mockCredential, mockRecurringEvents } from "./__fixtures__/meetingData";

describe("ZoomVideoApiAdapter Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Meeting Lifecycle", () => {
    it("should handle full meeting lifecycle (create -> update -> delete)", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);

      // Create meeting
      const meeting = await adapter.createMeeting(mockCalendarEvent);
      expect(meeting).toBeDefined();
      expect(meeting.type).toBe("zoom_video");
      expect(meeting.id).toBeDefined();
      expect(meeting.url).toBeDefined();

      // Update meeting
      const updatedEvent = {
        ...mockCalendarEvent,
        title: "Updated Meeting Title",
      };
      const updatedMeeting = await adapter.updateMeeting(
        { uid: meeting.id, type: "zoom_video" },
        updatedEvent
      );
      expect(updatedMeeting).toBeDefined();
      expect(updatedMeeting.id).toBe(meeting.id);

      // Delete meeting
      await expect(adapter.deleteMeeting(meeting.id)).resolves.not.toThrow();
    });

    it("should handle recurring meeting lifecycle", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);

      // Create recurring meeting
      const meeting = await adapter.createMeeting(mockRecurringEvents.daily);
      expect(meeting).toBeDefined();
      expect(meeting.type).toBe("zoom_video");

      // Update recurring meeting
      const updatedEvent = {
        ...mockRecurringEvents.daily,
        title: "Updated Recurring Meeting",
      };
      const updatedMeeting = await adapter.updateMeeting(
        { uid: meeting.id, type: "zoom_video" },
        updatedEvent
      );
      expect(updatedMeeting).toBeDefined();
      expect(updatedMeeting.id).toBe(meeting.id);

      // Delete recurring meeting
      await expect(adapter.deleteMeeting(meeting.id)).resolves.not.toThrow();
    });
  });

  describe("Token Refresh Flow", () => {
    it("should handle token refresh during API calls", async () => {
      const expiredCredential = {
        ...mockCredential,
        key: {
          ...mockCredential.key,
          expires_at: Date.now() - 3600000, // 1 hour ago
        },
      };

      const adapter = ZoomVideoApiAdapter(expiredCredential);

      // Should trigger token refresh
      const meeting = await adapter.createMeeting(mockCalendarEvent);
      expect(meeting).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);

      // Mock network failure
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

      await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });

    it("should handle rate limiting", async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);

      // Mock rate limit response
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 429, message: "Too many requests" }), { status: 429 })
      );

      await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Unexpected error");
    });
  });
});
