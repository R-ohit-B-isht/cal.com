import { mockFetchZoomApi } from "./__mocks__/zoomApi";

import { vi } from "vitest";

// Setup fetch and global types
const mockFetch = vi.fn() as unknown as typeof fetch;
global.fetch = mockFetch;

const mockResponse = vi.fn() as unknown as typeof Response;
const mockRequest = vi.fn() as unknown as typeof Request;
const mockHeaders = vi.fn() as unknown as typeof Headers;

global.Response = mockResponse;
global.Request = mockRequest;
global.Headers = mockHeaders;

// Mock Zoom API
vi.mock("./VideoApiAdapter", {
  default: {
    fetchZoomApi: mockFetchZoomApi,
  },
});

// Mock prisma
vi.mock("@calcom/prisma", {
  default: {
    credential: {
      update: vi.fn(),
    },
  },
});

// Mock logger
vi.mock("@calcom/lib/logger", {
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
});

// Mock dayjs
const mockDayjs = {
  tz: vi.fn().mockReturnValue({
    utc: vi.fn(),
    format: vi.fn(),
    day: vi.fn(),
    date: vi.fn(),
  }),
  utc: vi.fn().mockReturnValue({
    format: vi.fn(),
    day: vi.fn(),
    date: vi.fn(),
  }),
  format: vi.fn(),
  day: vi.fn(),
  date: vi.fn(),
};

vi.mock("@calcom/dayjs", {
  default: mockDayjs,
});
