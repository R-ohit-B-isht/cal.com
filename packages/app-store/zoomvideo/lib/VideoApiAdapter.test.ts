import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockZoomResponses, mockOAuthTokens } from "./__mocks__/zoomApi";
import ZoomVideoApiAdapter from "./VideoApiAdapter";
import { Frequency } from "@calcom/prisma/zod-utils";
import dayjs from "@calcom/dayjs";

describe("ZoomVideoApiAdapter", () => {
  const mockCredential = {
    id: 123,
    userId: 456,
    type: "zoom_video",
    key: mockOAuthTokens.valid,
    appId: "zoom",
  };

  describe("getRecurrence", () => {
    it("should handle daily recurring events", () => {
      const event = {
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1,
        },
        startTime: "2024-01-15T15:00:00Z",
        endTime: "2024-01-15T16:00:00Z",
        attendees: [{ timeZone: "UTC" }],
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter.translateEvent(event);

      expect(result).toMatchObject({
        recurrence: {
          type: 1,
          repeat_interval: 1,
          end_times: 5,
        },
      });
      // Note: type: 8 should not be present in the result
    });

    it("should handle weekly recurring events with specific day", () => {
      const event = {
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1,
        },
        startTime: "2024-01-15T15:00:00Z", // Monday
        endTime: "2024-01-15T16:00:00Z",
        attendees: [{ timeZone: "UTC" }],
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter.translateEvent(event);

      expect(result).toMatchObject({
        recurrence: {
          type: 2,
          weekly_days: 1, // Monday
          repeat_interval: 1,
          end_times: 4,
        },
      });
    });

    it("should handle monthly recurring events with specific date", () => {
      const event = {
        recurringEvent: {
          freq: Frequency.MONTHLY,
          until: new Date("2024-06-15T15:00:00Z"),
          interval: 1,
        },
        startTime: "2024-01-15T15:00:00Z",
        endTime: "2024-01-15T16:00:00Z",
        attendees: [{ timeZone: "UTC" }],
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter.translateEvent(event);

      expect(result).toMatchObject({
        recurrence: {
          type: 3,
          monthly_day: 15,
          repeat_interval: 1,
          end_date_time: "2024-06-15T15:00:00.000Z",
        },
      });
    });

    it("should return undefined for unsupported frequencies", () => {
      const event = {
        recurringEvent: {
          freq: "YEARLY",
          count: 5,
          interval: 1,
        },
        startTime: "2024-01-15T15:00:00Z",
        endTime: "2024-01-15T16:00:00Z",
        attendees: [{ timeZone: "UTC" }],
      };

      const adapter = ZoomVideoApiAdapter(mockCredential);
      const result = adapter.translateEvent(event);

      expect(result.recurrence).toBeUndefined();
    });
  });
});
