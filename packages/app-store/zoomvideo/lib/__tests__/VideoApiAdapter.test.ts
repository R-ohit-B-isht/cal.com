/// <reference types="vitest" />
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock, MockInstance } from "vitest";
import dayjs from "@calcom/dayjs";
import ZoomVideoApiAdapter from "../VideoApiAdapter";
import { mockErrorResponses } from "./fixtures/error-scenarios";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

// Mock I18NextTFunction type
type I18NextTFunction = (key: string) => string;

// Mock OAuthManager
class OAuthManager {
  request = vi.fn();
}

import { Frequency } from "@calcom/prisma/zod-utils";

// Test setup variables
let adapter: ReturnType<typeof ZoomVideoApiAdapter>;
let mockCredential: CredentialPayload;
let mockEvent: CalendarEvent;
let mockRequestSpy: MockInstance;

// Using imported types from @calcom packages

// Mock the OAuth Manager
const mockRequest = vi.fn().mockResolvedValue({
  json: {
    id: 123456789,
    join_url: "https://zoom.us/j/123456789",
    password: "password123"
  }
});

vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => ({
    request: mockRequest
  }))
}));

// Mock dependencies
vi.mock("@calcom/dayjs");
vi.mock("@calcom/prisma/zod-utils");
vi.mock("@calcom/lib/constants");
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockResolvedValue({
      json: {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123"
      }
    })
  }))
}));

describe("ZoomVideoApiAdapter", () => {

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();

    // Initialize adapter and credentials first
    mockCredential = {
      id: 1,
      type: "zoom_video",
      key: {},
      userId: 1,
      appId: "zoom",
      invalid: false,
    };

    adapter = ZoomVideoApiAdapter(mockCredential);

    const oauthManager = new OAuthManager();
    mockRequestSpy = oauthManager.request;
    
    mockCredential = {
      id: 1,
      type: "zoom_video",
      key: {},
      userId: 1,
      appId: "zoom",
      invalid: false,
    };

    adapter = ZoomVideoApiAdapter(mockCredential);

    mockEvent = {
      type: "zoom_video",
      startTime: "2024-01-07T10:00:00Z",
      endTime: "2024-01-07T11:00:00Z",
      title: "Test Meeting",
      description: "Test Description",
      attendees: [{ 
        email: "test@example.com", 
        timeZone: "UTC", 
        name: "Test User", 
        language: { translate: (() => "") as I18NextTFunction, locale: "en" }
      }],
      organizer: { 
        email: "organizer@example.com", 
        timeZone: "UTC", 
        name: "Organizer", 
        language: { translate: (() => "") as I18NextTFunction, locale: "en" }
      },
    };

    // Initialize adapter with mock credential and setup spy
    adapter = ZoomVideoApiAdapter(mockCredential);
    mockRequestSpy = vi.spyOn(OAuthManager.prototype, 'request').mockResolvedValue({
      json: {
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        password: "password123"
      }
    });
    
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock dayjs consistently
    vi.mocked(dayjs).mockReturnValue({
      tz: vi.fn().mockReturnValue({
        day: vi.fn().mockReturnValue(1),
        date: vi.fn().mockReturnValue(15)
      }),
      utc: vi.fn().mockReturnValue({
        format: vi.fn().mockReturnValue("2024-01-07T10:00:00Z")
      })
    });
  });

    describe("Meeting Creation (PR #31 Changes - Removal of type: 8)", () => {
      describe("Recurring Meetings", () => {
        it("should create daily recurring meeting without type 8", async () => {
          mockEvent.recurringEvent = {
            freq: Frequency.DAILY,
            count: 5,
            interval: 1
          };

          const result = await adapter.createMeeting(mockEvent);
          expect(result).toBeDefined();
          expect(result.type).toBe("zoom_video");
          
          const requestCall = mockRequest.mock.calls[0][0];
          const requestBody = JSON.parse(requestCall.options.body);
          
          // Verify recurrence is set correctly without type 8
          expect(requestBody.recurrence).toBeDefined();
          expect(requestBody.recurrence.type).toBe(1);
          expect(requestBody).not.toHaveProperty('type', 8);
          expect(requestBody.type).toBe(2); // Should be regular scheduled meeting
          
          // Verify response handling
          expect(result.id).toBe(123456789);
          expect(result.password).toBe("password123");
          expect(result.url).toBe("https://zoom.us/j/123456789");
        });
      });

      it("should create weekly recurring meeting with correct recurrence type", async () => {
        mockEvent.recurringEvent = {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        };

        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody.recurrence).toBeDefined();
        expect(requestBody.recurrence.type).toBe(2);
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
        expect(requestBody.recurrence.weekly_days).toBeDefined();
      });

      it("should create monthly recurring meeting with correct recurrence type", async () => {
        mockEvent.recurringEvent = {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1
        };

        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody.recurrence).toBeDefined();
        expect(requestBody.recurrence.type).toBe(3);
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
        expect(requestBody.recurrence.monthly_day).toBeDefined();
      });

      it("should handle unsupported frequencies without setting recurrence", async () => {
        mockEvent.recurringEvent = {
          freq: Frequency.YEARLY,
          count: 1,
          interval: 1
        };

        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody).not.toHaveProperty('recurrence');
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
      });

      it("should handle end date correctly without type 8", async () => {
        const untilDate = new Date("2024-12-31T23:59:59Z");
        mockEvent.recurringEvent = {
          freq: Frequency.DAILY,
          count: 30, // Required by RecurringEvent type
          until: untilDate,
          interval: 1
        };

        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody.recurrence).toBeDefined();
        expect(requestBody.recurrence.end_date_time).toBe(untilDate.toISOString());
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
      });

      it("should update existing recurring meeting without type 8", async () => {
        mockEvent.recurringEvent = {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        };

        const bookingRef = {
          type: "zoom_video",
          uid: "123456789",
          meetingId: "123456789"
        };

        await adapter.updateMeeting(bookingRef, mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody.recurrence).toBeDefined();
        expect(requestBody.recurrence.type).toBe(2);
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
      });
      });

      it("should handle WEEKLY frequency with correct day calculation", () => {
        mockEvent.recurringEvent = {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        };

        // Mock dayjs to return consistent day value
        vi.mocked(dayjs).mockReturnValue({
          tz: vi.fn().mockReturnValue({
            day: vi.fn().mockReturnValue(1) // Monday
          })
        });

        const result = ZoomVideoApiAdapter.getRecurrence(mockEvent);
        
        expect(result).toEqual({
          recurrence: {
            type: 2,
            weekly_days: 2, // Tuesday (1 + 1)
            end_times: 4,
            repeat_interval: 1
          }
        });
      });

      it("should handle MONTHLY frequency with correct date calculation", () => {
        mockEvent.recurringEvent = {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1
        };

        // Mock dayjs to return consistent date value
        vi.mocked(dayjs).mockReturnValue({
          tz: vi.fn().mockReturnValue({
            date: vi.fn().mockReturnValue(15)
          })
        });

        const result = ZoomVideoApiAdapter.getRecurrence(mockEvent);
        
        expect(result).toEqual({
          recurrence: {
            type: 3,
            monthly_day: 15,
            end_times: 3,
            repeat_interval: 1
          }
        });
      });

      it("should return undefined for unsupported frequencies", () => {
        mockEvent.recurringEvent = {
          freq: Frequency.YEARLY,
          count: 1,
          interval: 1
        };

        const result = ZoomVideoApiAdapter.getRecurrence(mockEvent);
        expect(result).toBeUndefined();
      });
    });

    describe("Edge Cases", () => {
      it("should handle non-recurring meetings without type 8", async () => {
        mockEvent.recurringEvent = undefined;
        
        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody).not.toHaveProperty('recurrence');
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
      });

      it("should handle missing attendees without type 8", async () => {
        mockEvent.attendees = [];
        mockEvent.recurringEvent = {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1
        };

        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody.recurrence).toBeDefined();
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
      });

      it("should handle invalid timezone without type 8", async () => {
        mockEvent.attendees = [{ email: "test@example.com", timeZone: "INVALID_TIMEZONE" }];
        mockEvent.recurringEvent = {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1
        };

        await adapter.createMeeting(mockEvent);
        
        const requestCall = mockRequestSpy.mock.calls[0][0];
        const requestBody = JSON.parse(requestCall.options.body);
        
        expect(requestBody.recurrence).toBeDefined();
        expect(requestBody).not.toHaveProperty('type', 8);
        expect(requestBody.type).toBe(2);
      });
    });

    describe("Error Handling", () => {
      beforeEach(() => {
        vi.resetAllMocks();
        adapter = ZoomVideoApiAdapter(mockCredential);
      });

      it("should handle malformed response data", async () => {
        const mockMalformedRequest = vi.fn().mockResolvedValue({
          json: {
            // Missing required fields
            id: undefined,
            join_url: undefined
          }
        });
        vi.spyOn(OAuthManager.prototype, 'request').mockImplementation(mockMalformedRequest);

        await expect(adapter.createMeeting(mockEvent)).rejects.toThrow();
      });

      it("should handle empty response", async () => {
        const mockEmptyRequest = vi.fn().mockResolvedValue({});
        vi.spyOn(OAuthManager.prototype, 'request').mockImplementation(mockEmptyRequest);

        await expect(adapter.createMeeting(mockEvent)).rejects.toThrow();
      });

      it("should handle rate limit errors", async () => {
        mockRequestSpy.mockImplementationOnce(mockErrorResponses.rateLimit);

        await expect(adapter.createMeeting(mockEvent)).rejects.toThrow("API rate limit exceeded");
      });

      it("should handle authentication errors", async () => {
        mockRequestSpy.mockImplementationOnce(mockErrorResponses.auth);

        await expect(adapter.createMeeting(mockEvent)).rejects.toThrow("Invalid access token");
      });

      it("should handle network errors", async () => {
        mockRequestSpy.mockImplementationOnce(mockErrorResponses.network);

        await expect(adapter.createMeeting(mockEvent)).rejects.toThrow("Network error occurred");
      });
    });

    describe("Integration Tests", () => {
      beforeEach(() => {
        vi.resetAllMocks();
        adapter = ZoomVideoApiAdapter(mockCredential);
      });
      it("should successfully create and update a recurring meeting", async () => {
        // Create meeting
        mockEvent.recurringEvent = {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        };

        const createResult = await adapter.createMeeting(mockEvent);
        expect(createResult).toBeDefined();
        expect(createResult.type).toBe("zoom_video");

        // Update meeting
        mockEvent.title = "Updated Meeting";
        const bookingRef = {
          type: "zoom_video",
          uid: createResult.id.toString(),
          meetingId: createResult.id.toString()
        };

        const updateResult = await adapter.updateMeeting(bookingRef, mockEvent);
        expect(updateResult).toBeDefined();
        expect(updateResult.type).toBe("zoom_video");
      });

      it("should handle the full meeting lifecycle", async () => {
        // Create meeting
        const createResult = await adapter.createMeeting(mockEvent);
        expect(createResult).toBeDefined();

        // Get meeting details
        const bookingRef = {
          type: "zoom_video",
          uid: createResult.id.toString(),
          meetingId: createResult.id.toString()
        };

        // Update meeting
        const updateResult = await adapter.updateMeeting(bookingRef, mockEvent);
        expect(updateResult).toBeDefined();

        // Delete meeting
        await expect(adapter.deleteMeeting(bookingRef)).resolves.not.toThrow();
      });
    });
});
