export const mockZoomApiResponses = {
  createMeeting: {
    success: {
      id: 123456789,
      join_url: "https://zoom.us/j/123456789",
      password: "password123",
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
        default_password_for_scheduled_meetings: "defaultpass",
      },
    },
  },
};
