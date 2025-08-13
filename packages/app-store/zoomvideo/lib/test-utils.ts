export const mockFetch = (response: any) => {
  return {
    ok: true,
    status: 200,
    json: () => response,
    text: () => JSON.stringify(response),
  };
};

export const mockFetchError = (status: number, message: string) => {
  return {
    ok: false,
    status,
    text: () => message,
  };
};

export const mockZoomResponse = {
  id: "123456789",
  join_url: "https://zoom.us/j/123456789",
  start_url: "https://zoom.us/s/123456789",
  password: "test-password",
};

export const mockCredential = {
  id: 1,
  key: {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Date.now() + 3600000,
  },
};

export const mockCalendarEvent = {
  type: "meeting",
  title: "Test Meeting",
  startTime: "2023-07-13T10:00:00Z",
  endTime: "2023-07-13T11:00:00Z",
  organizer: {
    email: "organizer@example.com",
    name: "Test Organizer",
  },
  attendees: [
    {
      email: "attendee@example.com",
      name: "Test Attendee",
    },
  ],
  uid: "test-uid",
  recurringEvent: null,
};
