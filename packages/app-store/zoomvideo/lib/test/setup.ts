import { vi } from "vitest";
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

// Mock constants
vi.mock("@calcom/lib/constants", () => ({
  APP_CREDENTIAL_SHARING_ENABLED: true,
  CREDENTIAL_SYNC_ENDPOINT: "http://localhost:3000",
  CREDENTIAL_SYNC_SECRET: "test-secret",
  CREDENTIAL_SYNC_SECRET_HEADER_NAME: "x-api-key",
}));

// Mock safeStringify
vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: JSON.stringify,
}));
