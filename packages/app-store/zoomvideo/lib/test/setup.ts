import { vi, beforeEach } from "vitest";
import dayjs from "@calcom/dayjs";

// Mock dayjs
vi.mock("@calcom/dayjs", () => ({
  default: dayjs,
}));

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock safeStringify
vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: JSON.stringify,
}));

// Mock external dependencies
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: class {
    constructor() {}
    request() {
      return Promise.resolve({ json: {} });
    }
  },
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
