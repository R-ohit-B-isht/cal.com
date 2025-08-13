import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { expect, test, vi, describe, beforeEach } from "vitest";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { internalServerErrorResponse, successResponse } from "../../_utils/testUtils";
import { getZoomAppKeys } from "./getZoomAppKeys";
import VideoApiAdapter from "./VideoApiAdapter";

const ZOOM_URLS = {
  CREATE_MEETING: "https://api.zoom.us/v2/users/me/meetings",
  UPDATE_MEETING: (meetingId: string) => `https://api.zoom.us/v2/meetings/${meetingId}`,
  DELETE_MEETING: (meetingId: string) => `https://api.zoom.us/v2/meetings/${meetingId}`,
  GET_MEETINGS: "https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300",
  USER_SETTINGS: "https://api.zoom.us/v2/users/me/settings?custom_query_fields=default_password_for_scheduled_meetings,auto_recording",
};

vi.mock("./getZoomAppKeys", () => ({
  getZoomAppKeys: vi.fn().mockResolvedValue({
    client_id: "FAKE_ZOOM_CLIENT_ID",
    client_secret: "FAKE_ZOOM_CLIENT_SECRET",
  }),
}));

const mockRequest = vi.fn();
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => {
    return { request: mockRequest };
  }),
}));

const testCredential = {
  appId: "zoom",
  id: 1,
  invalid: false,
  key: {
    scope: "meeting:write meeting:read",
    token_type: "Bearer",
    expiry_date: 1625097600000,
    access_token: "fake_access_token",
    refresh_token: "fake_refresh_token",
  },
  type: "zoom_video",
  userId: 1,
  user: { email: "test@example.com" },
  teamId: 1,
};

describe("createMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Successful createMeeting call with basic event", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({
          json: {
            recording: { auto_recording: "local" },
            schedule_meeting: { default_password_for_scheduled_meetings: "123456" },
          },
        });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: {
            id: 123456789,
            join_url: "https://zoom.us/j/123456789",
            password: "123456",
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Zoom Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    const result = await videoApi.createMeeting(event);

    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith({
      url: ZOOM_URLS.CREATE_MEETING,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"topic":"Test Zoom Meeting"'),
      },
    });

    expect(result).toEqual({
      type: "zoom_video",
      id: "123456789",
      password: "123456",
      url: "https://zoom.us/j/123456789",
    });
  });

  test("createMeeting with recurring event - WEEKLY", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Weekly Meeting",
      description: "Recurring weekly meeting",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
      recurringEvent: {
        freq: 2,
        interval: 1,
        count: 10,
      },
    };

    await videoApi.createMeeting(event);

    expect(mockRequest).toHaveBeenCalledWith({
      url: ZOOM_URLS.CREATE_MEETING,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"type":8'),
      },
    });
  });

  test("createMeeting with recurring event - DAILY", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Daily Meeting",
      description: "Recurring daily meeting",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
      recurringEvent: {
        freq: 3,
        interval: 1,
        until: new Date("2024-02-15T10:00:00.000Z"),
      },
    };

    await videoApi.createMeeting(event);

    expect(mockRequest).toHaveBeenCalledWith({
      url: ZOOM_URLS.CREATE_MEETING,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"type":8'),
      },
    });
  });

  test("createMeeting with recurring event - MONTHLY", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Monthly Meeting",
      description: "Recurring monthly meeting",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
      recurringEvent: {
        freq: 1,
        interval: 2,
        count: 6,
      },
    };

    await videoApi.createMeeting(event);

    expect(mockRequest).toHaveBeenCalledWith({
      url: ZOOM_URLS.CREATE_MEETING,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"type":8'),
      },
    });
  });

  test("createMeeting with unsupported recurring frequency", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Yearly Meeting",
      description: "Recurring yearly meeting",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
      recurringEvent: {
        freq: 0,
        interval: 1,
        count: 5,
      },
    };

    await videoApi.createMeeting(event);

    expect(mockRequest).toHaveBeenCalledWith({
      url: ZOOM_URLS.CREATE_MEETING,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.not.stringContaining('"type":8'),
      },
    });
  });

  test("createMeeting handles API failure", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        throw new Error("Zoom API Error");
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    await expect(() => videoApi.createMeeting(event)).rejects.toThrowError("Unexpected error");
  });

  test("createMeeting handles invalid response format", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({ json: { invalid: "response" } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    await expect(() => videoApi.createMeeting(event)).rejects.toThrowError();
  });

  test("createMeeting handles user settings fetch failure", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        throw new Error("Settings API Error");
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    const result = await videoApi.createMeeting(event);
    expect(result.type).toBe("zoom_video");
  });

  test("createMeeting with missing join_url throws error", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    await expect(() => videoApi.createMeeting(event)).rejects.toThrowError();
  });
});

describe("updateMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Successful updateMeeting call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.UPDATE_MEETING("123456789")) {
        return Promise.resolve({ json: {} });
      }
      if (url === "https://api.zoom.us/v2/meetings/123456789") {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const bookingRef = { uid: "123456789" };
    const event = {
      title: "Updated Meeting",
      description: "Updated Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    const result = await videoApi.updateMeeting(bookingRef, event);
    expect(result.type).toBe("zoom_video");
    expect(result.id).toBe("123456789");
  });

  test("updateMeeting handles failure", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(() => {
      throw new Error("Update failed");
    });

    const bookingRef = { uid: "123456789" };
    const event = {
      title: "Updated Meeting",
      description: "Updated Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    await expect(() => videoApi.updateMeeting(bookingRef, event)).rejects.toThrowError("Failed to update meeting");
  });

  test("updateMeeting with recurring event", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.UPDATE_MEETING("123456789")) {
        return Promise.resolve({ json: {} });
      }
      if (url === "https://api.zoom.us/v2/meetings/123456789") {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const bookingRef = { uid: "123456789" };
    const event = {
      title: "Updated Recurring Meeting",
      description: "Updated recurring meeting",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
      recurringEvent: {
        freq: 2,
        interval: 1,
        count: 5,
      },
    };

    const result = await videoApi.updateMeeting(bookingRef, event);
    expect(result.type).toBe("zoom_video");
  });
});

describe("deleteMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Successful deleteMeeting call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.DELETE_MEETING("123456789")) {
        return Promise.resolve({ json: {} });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(videoApi.deleteMeeting("123456789")).resolves.toBeUndefined();
  });

  test("deleteMeeting handles failure", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(() => {
      throw new Error("Delete failed");
    });

    await expect(() => videoApi.deleteMeeting("123456789")).rejects.toThrowError("Failed to delete meeting");
  });

  test("deleteMeeting with empty uid", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.DELETE_MEETING("")) {
        return Promise.resolve({ json: {} });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(videoApi.deleteMeeting("")).resolves.toBeUndefined();
  });
});

describe("getAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Successful getAvailability call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.GET_MEETINGS) {
        return Promise.resolve({
          json: {
            meetings: [
              {
                id: 123456789,
                start_time: "2024-01-15T10:00:00Z",
                duration: 60,
                topic: "Existing Meeting",
                agenda: "",
                created_at: "2024-01-14T10:00:00Z",
                host_id: "host123",
                join_url: "https://zoom.us/j/123456789",
                pmi: "",
                timezone: "UTC",
                type: 2,
                uuid: "uuid123",
              },
            ],
            next_page_token: "",
            page_count: 1,
            page_number: 1,
            page_size: 300,
            total_records: 1,
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const availability = await videoApi.getAvailability();

    expect(availability).toEqual([
      {
        start: "2024-01-15T10:00:00Z",
        end: "2024-01-15T11:00:00.000Z",
      },
    ]);
  });

  test("getAvailability with multiple meetings", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.GET_MEETINGS) {
        return Promise.resolve({
          json: {
            meetings: [
              {
                id: 123456789,
                start_time: "2024-01-15T10:00:00Z",
                duration: 60,
                topic: "Meeting 1",
                agenda: "",
                created_at: "2024-01-14T10:00:00Z",
                host_id: "host123",
                join_url: "https://zoom.us/j/123456789",
                pmi: "",
                timezone: "UTC",
                type: 2,
                uuid: "uuid123",
              },
              {
                id: 987654321,
                start_time: "2024-01-15T14:00:00Z",
                duration: 30,
                topic: "Meeting 2",
                agenda: "",
                created_at: "2024-01-14T10:00:00Z",
                host_id: "host123",
                join_url: "https://zoom.us/j/987654321",
                pmi: "",
                timezone: "UTC",
                type: 2,
                uuid: "uuid456",
              },
            ],
            next_page_token: "",
            page_count: 1,
            page_number: 1,
            page_size: 300,
            total_records: 2,
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const availability = await videoApi.getAvailability();

    expect(availability).toEqual([
      {
        start: "2024-01-15T10:00:00Z",
        end: "2024-01-15T11:00:00.000Z",
      },
      {
        start: "2024-01-15T14:00:00Z",
        end: "2024-01-15T14:30:00.000Z",
      },
    ]);
  });

  test("getAvailability handles API failure gracefully", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(() => {
      throw new Error("API Error");
    });

    const availability = await videoApi.getAvailability();
    expect(availability).toEqual([]);
  });

  test("getAvailability with empty meetings list", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.GET_MEETINGS) {
        return Promise.resolve({
          json: {
            meetings: [],
            next_page_token: "",
            page_count: 1,
            page_number: 1,
            page_size: 300,
            total_records: 0,
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const availability = await videoApi.getAvailability();
    expect(availability).toEqual([]);
  });

  test("getAvailability handles invalid response format", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.GET_MEETINGS) {
        return Promise.resolve({
          json: { invalid: "format" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const availability = await videoApi.getAvailability();
    expect(availability).toEqual([]);
  });
});

describe("OAuth and Token Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("VideoApiAdapter initializes OAuthManager with correct parameters", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    await videoApi.createMeeting(event);

    expect(OAuthManager).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceOwner: {
          type: "user",
          id: testCredential.userId,
        },
        appSlug: "zoom",
        currentTokenObject: testCredential.key,
      })
    );
  });

  test("VideoApiAdapter handles token refresh scenario", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    const mockGetZoomAppKeys = vi.mocked(getZoomAppKeys);
    mockGetZoomAppKeys.mockResolvedValue({
      client_id: "test_client_id",
      client_secret: "test_client_secret",
    });

    mockRequest.mockImplementation(({ url }) => {
      if (url === ZOOM_URLS.USER_SETTINGS) {
        return Promise.resolve({ json: { recording: {}, schedule_meeting: {} } });
      }
      if (url === ZOOM_URLS.CREATE_MEETING) {
        return Promise.resolve({
          json: { id: 123456789, join_url: "https://zoom.us/j/123456789", password: "" },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T11:00:00.000Z",
      organizer: { timeZone: "America/New_York" },
      attendees: [{ timeZone: "America/New_York" }],
    };

    await videoApi.createMeeting(event);

    expect(OAuthManager).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchNewTokenObject: expect.any(Function),
        isTokenObjectUnusable: expect.any(Function),
        isAccessTokenUnusable: expect.any(Function),
      })
    );
  });
});
