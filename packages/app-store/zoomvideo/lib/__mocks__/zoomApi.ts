import { vi } from "vitest";

import type { ZoomEventResult } from "../VideoApiAdapter";

export const mockZoomResponses = {
  createMeeting: {
    success: {
      id: 123456789,
      join_url: "https://zoom.us/j/123456789",
      password: "password123",
    } satisfies ZoomEventResult,
    error: {
      code: 124,
      message: "Invalid access token",
    },
  },
  getMeetings: {
    success: {
      next_page_token: "",
      page_count: 1,
      page_number: 1,
      page_size: 30,
      total_records: 2,
      meetings: [
        {
          agenda: "Test Meeting 1",
          created_at: "2024-01-01T10:00:00Z",
          duration: 60,
          host_id: "user123",
          id: 123456789,
          join_url: "https://zoom.us/j/123456789",
          pmi: "1234567890",
          start_time: "2024-01-01T10:00:00Z",
          timezone: "UTC",
          topic: "Test Meeting",
          type: 2,
          uuid: "abcdef123456",
        },
        {
          agenda: "Test Meeting 2",
          created_at: "2024-01-01T11:00:00Z",
          duration: 30,
          host_id: "user123",
          id: 987654321,
          join_url: "https://zoom.us/j/987654321",
          pmi: "0987654321",
          start_time: "2024-01-01T11:00:00Z",
          timezone: "UTC",
          topic: "Another Test Meeting",
          type: 2,
          uuid: "xyz789abc",
        },
      ],
    },
    error: {
      code: 124,
      message: "Invalid access token",
    },
  },
  userSettings: {
    success: {
      recording: {
        auto_recording: "none",
      },
      schedule_meeting: {
        default_password_for_scheduled_meetings: "defaultpass123",
      },
    },
    error: {
      code: 124,
      message: "Invalid access token",
    },
  },
};

export const mockFetchZoomApi = vi.fn().mockImplementation((endpoint: string, options?: RequestInit) => {
  // Simulate token expiration
  if (endpoint.includes("expired_token")) {
    return Promise.reject({
      code: 124,
      message: "Access token expired",
    });
  }

  // Mock different endpoints
  if (endpoint.includes("users/me/meetings")) {
    return Promise.resolve(mockZoomResponses.getMeetings.success);
  }

  if (endpoint.includes("users/me/settings")) {
    return Promise.resolve(mockZoomResponses.userSettings.success);
  }

  if (endpoint.includes("meetings") && options?.method === "POST") {
    return Promise.resolve(mockZoomResponses.createMeeting.success);
  }

  if (endpoint.includes("meetings") && options?.method === "PATCH") {
    return Promise.resolve(mockZoomResponses.createMeeting.success);
  }

  if (endpoint.includes("meetings") && options?.method === "DELETE") {
    return Promise.resolve({});
  }

  return Promise.reject(new Error("Unexpected endpoint"));
});
