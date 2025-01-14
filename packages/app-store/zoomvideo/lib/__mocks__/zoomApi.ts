import { ZoomEventResult } from "../VideoApiAdapter";

export const mockZoomResponses = {
  successfulMeetingCreation: {
    id: 123456789,
    join_url: "https://zoom.us/j/123456789",
    password: "password123",
  } as ZoomEventResult,
  
  userSettings: {
    recording: {
      auto_recording: "none",
    },
    schedule_meeting: {
      default_password_for_scheduled_meetings: "defaultpass",
    },
  },
  
  meetings: {
    next_page_token: "",
    page_count: 1,
    page_number: 1,
    page_size: 30,
    total_records: 1,
    meetings: [
      {
        agenda: "Test Meeting",
        created_at: "2024-01-15T10:00:00Z",
        duration: 60,
        host_id: "user123",
        id: 123456789,
        join_url: "https://zoom.us/j/123456789",
        pmi: "1234567890",
        start_time: "2024-01-15T15:00:00Z",
        timezone: "UTC",
        topic: "Test Meeting",
        type: 2,
        uuid: "abcdef123456",
      },
    ],
  },
};

export const mockOAuthTokens = {
  valid: {
    access_token: "valid_access_token",
    refresh_token: "valid_refresh_token",
    expires_in: 3600,
  },
  expired: {
    access_token: "expired_access_token",
    refresh_token: "expired_refresh_token",
    expires_in: 0,
  },
};
