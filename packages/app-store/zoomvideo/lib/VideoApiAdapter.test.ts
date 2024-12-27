import { expect, test, vi, describe } from "vitest";

import { Frequency } from "@calcom/prisma/zod-utils";

import { successResponse } from "../../_utils/testUtils";
import config from "../config.json";
import VideoApiAdapter from "./VideoApiAdapter";

const URLS = {
  CREATE_MEETING: {
    url: "https://api.zoom.us/v2/users/me/meetings",
    method: "POST",
  },
  UPDATE_MEETING: {
    url: "https://api.zoom.us/v2/meetings/123",
    method: "PATCH",
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
    return { request: mockRequestRaw };
  }),
}));

const testCredential = {
  appId: config.slug,
  id: 1,
  invalid: false,
  key: {
    scope: "meeting:write",
    token_type: "Bearer",
    expiry_date: 1625097600000,
    access_token: "FAKE_ACCESS_TOKEN",
    refresh_token: "FAKE_REFRESH_TOKEN",
  },
  type: config.type,
  userId: 1,
  user: { email: "test@example.com" },
  teamId: 1,
};

describe("createMeeting with Recurring Events", () => {
  test("Creates daily recurring meeting correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.CREATE_MEETING.url && options.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeDefined();
        expect(body.recurrence.type).toBe(1); // Daily
        expect(body.recurrence.repeat_interval).toBe(1);
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "recurring",
      title: "Daily Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      recurringEvent: {
        freq: Frequency.DAILY,
        count: 5,
        interval: 1,
      },
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.createMeeting(event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });

  test("Creates weekly recurring meeting correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.CREATE_MEETING.url && options.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeDefined();
        expect(body.recurrence.type).toBe(2); // Weekly
        expect(body.recurrence.weekly_days).toBeDefined();
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "recurring",
      title: "Weekly Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      recurringEvent: {
        freq: Frequency.WEEKLY,
        count: 4,
        interval: 1,
      },
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.createMeeting(event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });

  test("Creates monthly recurring meeting correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.CREATE_MEETING.url && options.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeDefined();
        expect(body.recurrence.type).toBe(3); // Monthly
        expect(body.recurrence.monthly_day).toBeDefined();
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "recurring",
      title: "Monthly Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      recurringEvent: {
        freq: Frequency.MONTHLY,
        count: 3,
        interval: 1,
      },
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.createMeeting(event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });

  test("Handles unsupported recurrence frequencies correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.CREATE_MEETING.url && options.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeUndefined();
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "recurring",
      title: "Yearly Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      recurringEvent: {
        freq: "YEARLY",
        count: 2,
        interval: 1,
      },
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.createMeeting(event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });

  test("Handles recurrence with until date correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.CREATE_MEETING.url && options.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeDefined();
        expect(body.recurrence.end_date_time).toBeDefined();
        expect(body.recurrence.end_times).toBeUndefined();
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "recurring",
      title: "Test Meeting with Until Date",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      recurringEvent: {
        freq: Frequency.DAILY,
        until: new Date("2024-02-01T00:00:00Z"),
        interval: 1,
      },
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.createMeeting(event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });

  test("Handles non-recurring meeting correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.CREATE_MEETING.url && options.method === "POST") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeUndefined();
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "standard",
      title: "Non-recurring Test Meeting",
      description: "Test Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.createMeeting(event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });
});

describe("updateMeeting with Recurring Events", () => {
  test("Updates recurring meeting correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === "https://api.zoom.us/v2/meetings/123" && options.method === "PATCH") {
        const body = JSON.parse(options.body);
        expect(body.recurrence).toBeDefined();
        return Promise.resolve(successResponse({ json: {} }));
      }
      if (url === "https://api.zoom.us/v2/meetings/123" && options.method === "GET") {
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
      throw new Error("Unexpected request");
    });

    const event = {
      type: "recurring",
      title: "Updated Test Meeting",
      description: "Updated Description",
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T11:00:00Z"),
      recurringEvent: {
        freq: Frequency.DAILY,
        count: 5,
        interval: 1,
      },
      attendees: [{ email: "test@example.com", timeZone: "UTC" }],
      organizer: { email: "organizer@example.com", timeZone: "UTC" },
    };

    const result = await videoApi.updateMeeting({ uid: "123" }, event);
    expect(result).toEqual({
      type: "zoom_video",
      id: "123",
      password: "password123",
      url: "https://zoom.us/j/123",
    });
  });
});
