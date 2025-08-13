import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPrisma = {
  credential: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const mockOAuthManager = {
  requestAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
};

const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

const mockDayjs = vi.fn(() => ({
  format: vi.fn(() => "2023-07-13T10:00:00Z"),
  add: vi.fn(() => mockDayjs()),
  utc: vi.fn(() => mockDayjs()),
  tz: vi.fn(() => mockDayjs()),
  toISOString: vi.fn(() => "2023-07-13T10:00:00.000Z"),
}));

const mockSafeStringify = vi.fn((obj: any) => JSON.stringify(obj));

const mockGetZoomAppKeys = vi.fn();
const mockInvalidateCredential = vi.fn();

vi.mock("zod", () => ({
  z: {
    object: vi.fn(() => ({
      parse: vi.fn(),
    })),
    string: vi.fn(),
    number: vi.fn(),
    boolean: vi.fn(),
    array: vi.fn(),
  },
}));

vi.mock("@calcom/dayjs", () => ({
  default: mockDayjs,
}));

vi.mock("@calcom/lib/constants", () => ({
  APP_CREDENTIAL_SHARING_ENABLED: true,
  CREDENTIAL_SYNC_ENDPOINT: "https://api.example.com/sync",
  CREDENTIAL_SYNC_SECRET: "test-secret",
  CREDENTIAL_SYNC_SECRET_HEADER_NAME: "X-Cal-Secret",
}));

vi.mock("@calcom/lib/logger", () => ({
  default: mockLogger,
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: mockSafeStringify,
}));

vi.mock("@calcom/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  Frequency: {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
  },
}));

vi.mock("@calcom/types/Calendar", () => ({}));
vi.mock("@calcom/types/Credential", () => ({}));
vi.mock("@calcom/types/EventManager", () => ({}));
vi.mock("@calcom/types/VideoApiAdapter", () => ({}));

vi.mock("./getZoomAppKeys", () => ({
  getZoomAppKeys: mockGetZoomAppKeys,
}));

vi.mock("../../_utils/invalidateCredential", () => ({
  invalidateCredential: mockInvalidateCredential,
}));

vi.mock("../../_utils/OAuthManager", () => ({
  default: vi.fn(() => mockOAuthManager),
}));

(globalThis as any).fetch = vi.fn();

describe("VideoApiAdapter", () => {
  let VideoApiAdapter: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetZoomAppKeys.mockResolvedValue({
      client_id: "test-client-id",
      client_secret: "test-client-secret",
    });

    const module = await import("./VideoApiAdapter");
    VideoApiAdapter = module.default;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("ZoomVideoApiAdapter", () => {
    const mockCredential = {
      id: 1,
      key: {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: Date.now() + 3600000,
      },
    };

    const mockCalendarEvent = {
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

    it("should create adapter instance successfully", async () => {
      const adapter = VideoApiAdapter(mockCredential);
      expect(adapter).toBeDefined();
      expect(typeof adapter.getAvailability).toBe("function");
      expect(typeof adapter.createMeeting).toBe("function");
      expect(typeof adapter.deleteMeeting).toBe("function");
      expect(typeof adapter.updateMeeting).toBe("function");
    });

    describe("getAvailability", () => {
      it("should return empty array for availability", async () => {
        const adapter = VideoApiAdapter(mockCredential);
        const availability = await adapter.getAvailability();
        expect(availability).toEqual([]);
      });
    });

    describe("createMeeting", () => {
      it("should create meeting successfully", async () => {
        const mockZoomResponse = {
          id: "123456789",
          join_url: "https://zoom.us/j/123456789",
          start_url: "https://zoom.us/s/123456789",
          password: "test-password",
        };

        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => mockZoomResponse,
        });

        const adapter = VideoApiAdapter(mockCredential);
        const result = await adapter.createMeeting(mockCalendarEvent);

        expect(result).toEqual({
          type: "zoom_video",
          id: "123456789",
          password: "test-password",
          url: "https://zoom.us/j/123456789",
        });
      });

      it("should handle recurring events", async () => {
        const recurringEvent = {
          ...mockCalendarEvent,
          recurringEvent: {
            freq: "weekly",
            count: 5,
            interval: 1,
          },
        };

        const mockZoomResponse = {
          id: "123456789",
          join_url: "https://zoom.us/j/123456789",
          start_url: "https://zoom.us/s/123456789",
          password: "test-password",
        };

        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => mockZoomResponse,
        });

        const adapter = VideoApiAdapter(mockCredential);
        const result = await adapter.createMeeting(recurringEvent);

        expect(result).toEqual({
          type: "zoom_video",
          id: "123456789",
          password: "test-password",
          url: "https://zoom.us/j/123456789",
        });
      });

      it("should handle API errors", async () => {
        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => "Bad Request",
        });

        const adapter = VideoApiAdapter(mockCredential);
        
        await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow();
      });

      it("should handle network errors", async () => {
        (globalThis.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const adapter = VideoApiAdapter(mockCredential);
        
        await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow("Network error");
      });
    });

    describe("deleteMeeting", () => {
      it("should delete meeting successfully", async () => {
        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 204,
        });

        const adapter = VideoApiAdapter(mockCredential);
        await expect(adapter.deleteMeeting("123456789")).resolves.not.toThrow();
      });

      it("should handle delete errors", async () => {
        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => "Meeting not found",
        });

        const adapter = VideoApiAdapter(mockCredential);
        await expect(adapter.deleteMeeting("123456789")).rejects.toThrow();
      });
    });

    describe("updateMeeting", () => {
      it("should update meeting successfully", async () => {
        const mockZoomResponse = {
          id: "123456789",
          join_url: "https://zoom.us/j/123456789",
          start_url: "https://zoom.us/s/123456789",
          password: "updated-password",
        };

        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => mockZoomResponse,
        });

        const adapter = VideoApiAdapter(mockCredential);
        const result = await adapter.updateMeeting("123456789", mockCalendarEvent);

        expect(result).toEqual({
          type: "zoom_video",
          id: "123456789",
          password: "updated-password",
          url: "https://zoom.us/j/123456789",
        });
      });

      it("should handle update errors", async () => {
        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => "Invalid request",
        });

        const adapter = VideoApiAdapter(mockCredential);
        await expect(adapter.updateMeeting("123456789", mockCalendarEvent)).rejects.toThrow();
      });
    });

    describe("token refresh", () => {
      it("should refresh expired token", async () => {
        const expiredCredential = {
          ...mockCredential,
          key: {
            ...mockCredential.key,
            expires_at: Date.now() - 1000,
          },
        };

        mockOAuthManager.refreshAccessToken.mockResolvedValueOnce({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_at: Date.now() + 3600000,
        });

        mockPrisma.credential.update.mockResolvedValueOnce({});

        const mockZoomResponse = {
          id: "123456789",
          join_url: "https://zoom.us/j/123456789",
          start_url: "https://zoom.us/s/123456789",
          password: "test-password",
        };

        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => mockZoomResponse,
        });

        const adapter = VideoApiAdapter(expiredCredential);
        const result = await adapter.createMeeting(mockCalendarEvent);

        expect(mockOAuthManager.refreshAccessToken).toHaveBeenCalled();
        expect(mockPrisma.credential.update).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it("should handle token refresh failure", async () => {
        const expiredCredential = {
          ...mockCredential,
          key: {
            ...mockCredential.key,
            expires_at: Date.now() - 1000,
          },
        };

        mockOAuthManager.refreshAccessToken.mockRejectedValueOnce(new Error("Refresh failed"));

        const adapter = VideoApiAdapter(expiredCredential);
        await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow();
        expect(mockInvalidateCredential).toHaveBeenCalled();
      });
    });

    describe("edge cases", () => {
      it("should handle missing credential key", async () => {
        const invalidCredential = {
          id: 1,
          key: null,
        };

        const adapter = VideoApiAdapter(invalidCredential);
        await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow();
      });

      it("should handle malformed API response", async () => {
        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => {},
        });

        const adapter = VideoApiAdapter(mockCredential);
        await expect(adapter.createMeeting(mockCalendarEvent)).rejects.toThrow();
      });

      it("should handle very long meeting titles", async () => {
        const longTitleEvent = {
          ...mockCalendarEvent,
          title: "A".repeat(500),
        };

        const mockZoomResponse = {
          id: "123456789",
          join_url: "https://zoom.us/j/123456789",
          start_url: "https://zoom.us/s/123456789",
          password: "test-password",
        };

        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => mockZoomResponse,
        });

        const adapter = VideoApiAdapter(mockCredential);
        const result = await adapter.createMeeting(longTitleEvent);
        expect(result).toBeDefined();
      });

      it("should handle events with no attendees", async () => {
        const noAttendeesEvent = {
          ...mockCalendarEvent,
          attendees: [],
        };

        const mockZoomResponse = {
          id: "123456789",
          join_url: "https://zoom.us/j/123456789",
          start_url: "https://zoom.us/s/123456789",
          password: "test-password",
        };

        (globalThis.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => mockZoomResponse,
        });

        const adapter = VideoApiAdapter(mockCredential);
        const result = await adapter.createMeeting(noAttendeesEvent);
        expect(result).toBeDefined();
      });
    });
  });
});
