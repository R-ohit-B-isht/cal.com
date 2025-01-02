import { afterEach, describe, expect, test, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";
import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { internalServerErrorResponse, successResponse } from "../../_utils/testUtils";
import config from "../config.json";
import VideoApiAdapter from "./VideoApiAdapter";
import { Frequency } from "@calcom/prisma/zod-utils";

// Import test setup after other imports to avoid circular dependencies
import "../../test-setup";

afterEach(() => {
  mockReset(prismaMock);
  vi.resetAllMocks();
});

const URLS = {
  CREATE_MEETING: {
    url: "https://api.zoom.us/v2/users/me/meetings",
    method: "POST",
  },
  UPDATE_MEETING: {
    url: "https://api.zoom.us/v2/meetings",
    method: "PATCH",
  },
  DELETE_MEETING: {
    url: "https://api.zoom.us/v2/meetings",
    method: "DELETE",
  },
};

vi.mock("../../_utils/getParsedAppKeysFromSlug", () => ({
  default: vi.fn().mockImplementation((slug) => {
    if (slug !== config.slug) {
      throw new Error(
        `expected to be called with the correct slug. Expected ${config.slug} -  Received ${slug}`
      );
    }
    return {
      client_id: "FAKE_CLIENT_ID",
      client_secret: "FAKE_CLIENT_SECRET",
    };
  }),
}));

const mockRequestRaw = vi.fn();
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(() => {
    return { requestRaw: mockRequestRaw };
  }),
}));

const testCredential = {
  appId: config.slug,
  id: 1,
  invalid: false,
  key: {
    scope: "meeting:write meeting:read",
    token_type: "Bearer",
    expiry_date: 1625097600000,
    access_token: "MOCK_ACCESS_TOKEN",
    refresh_token: "MOCK_REFRESH_TOKEN",
  },
  type: config.type,
  userId: 1,
  user: { email: "test@example.com" },
  teamId: 1,
};

describe("getRecurrence", () => {
  test("daily recurring meeting", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      title: "Daily Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      recurringEvent: {
        freq: Frequency.DAILY,
        count: 5,
        interval: 1,
      },
    };

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 123,
              join_url: "https://zoom.us/j/123",
              password: "password123",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const meeting = await videoApi.createMeeting(event);
    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.CREATE_MEETING.url,
      options: {
        method: "POST",
        body: expect.stringContaining('"type":2'),
        headers: {
          "Content-Type": "application/json",
        },
      },
    });

    const requestBody = JSON.parse(mockRequestRaw.mock.calls[0][0].options.body);
    expect(requestBody.recurrence).toEqual({
      type: 1,
      repeat_interval: 1,
      end_times: 5,
    });

    expect(meeting).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });

  test("weekly recurring meeting", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      title: "Weekly Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"), // Monday
      endTime: new Date("2024-01-01T11:00:00Z"),
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      recurringEvent: {
        freq: Frequency.WEEKLY,
        count: 4,
        interval: 1,
      },
    };

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 124,
              join_url: "https://zoom.us/j/124",
              password: "password124",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const meeting = await videoApi.createMeeting(event);
    const requestBody = JSON.parse(mockRequestRaw.mock.calls[0][0].options.body);
    expect(requestBody.recurrence).toEqual({
      type: 2,
      repeat_interval: 1,
      end_times: 4,
      weekly_days: 2, // Monday = 2 in Zoom's API
    });
  });

  test("monthly recurring meeting", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      title: "Monthly Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-15T10:00:00Z"), // 15th of the month
      endTime: new Date("2024-01-15T11:00:00Z"),
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      recurringEvent: {
        freq: Frequency.MONTHLY,
        until: new Date("2024-06-15T10:00:00Z"),
        interval: 1,
      },
    };

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 125,
              join_url: "https://zoom.us/j/125",
              password: "password125",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const meeting = await videoApi.createMeeting(event);
    const requestBody = JSON.parse(mockRequestRaw.mock.calls[0][0].options.body);
    expect(requestBody.recurrence).toEqual({
      type: 3,
      repeat_interval: 1,
      end_date_time: "2024-06-15T10:00:00Z",
      monthly_day: 15,
    });
  });
});

describe("error handling", () => {
  test("handles expired OAuth token", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          internalServerErrorResponse({
            json: {
              code: 124,
              message: "Invalid access token",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    await expect(() => videoApi.createMeeting(event)).rejects.toThrow("Unexpected error");
  });

  test("handles missing join URL", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 126,
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    await expect(() => videoApi.createMeeting(event)).rejects.toThrow(
      "Failed to create meeting"
    );
  });
});

describe("updateMeeting", () => {
  test("updates recurring meeting schedule", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      uid: "127",
      title: "Updated Test Meeting",
      description: "Updated Description",
      startTime: new Date("2024-02-01T10:00:00Z"),
      endTime: new Date("2024-02-01T11:00:00Z"),
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      recurringEvent: {
        freq: Frequency.WEEKLY,
        count: 3,
        interval: 2,
      },
    };

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url.includes(URLS.UPDATE_MEETING.url)) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 127,
              join_url: "https://zoom.us/j/127",
              password: "password127",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const meeting = await videoApi.updateMeeting({ uid: "127" }, event);
    const requestBody = JSON.parse(mockRequestRaw.mock.calls[0][0].options.body);
    expect(requestBody.recurrence).toEqual({
      type: 2,
      repeat_interval: 2,
      end_times: 3,
      weekly_days: 5, // Thursday = 5 in Zoom's API
    });

    expect(meeting).toEqual({
      type: "zoom_video",
      id: "127",
      password: "password127",
      url: "https://zoom.us/j/127",
    });
  });
});
