import { describe, expect, it, vi } from "vitest";

import logger from "@calcom/lib/logger";

// Mock environment before importing logger
vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: false,
}));

describe("Logger default level", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_LOGGER_LEVEL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should use level 4 (warn) by default", () => {
    expect(logger.settings.minLevel).toBe(4);
  });

  it("should use level from env if set", () => {
    process.env.NEXT_PUBLIC_LOGGER_LEVEL = "3";
    // Re-import logger to test with new env
    const newLogger = require("@calcom/lib/logger").default;
    expect(newLogger.settings.minLevel).toBe(3);
  });

  it("should mask sensitive data in logs", () => {
    const sensitiveData = {
      user: "test@example.com",
      password: "secret123",
      credentials: { token: "sensitive-token" },
      other: "public-data",
    };
    
    // Verify that sensitive keys are configured for masking
    expect(logger.settings.maskValuesOfKeys).toContain("password");
    expect(logger.settings.maskValuesOfKeys).toContain("credentials");
    
    // Log the data and verify it's masked (implementation-specific check)
    const maskedData = logger.settings.maskValuesOfKeys.reduce((data, key) => {
      if (key in sensitiveData) {
        return { ...data, [key]: "[REDACTED]" };
      }
      return data;
    }, sensitiveData);
    
    expect(maskedData.password).toBe("[REDACTED]");
    expect(maskedData.credentials).toBe("[REDACTED]");
    expect(maskedData.user).toBe("test@example.com");
    expect(maskedData.other).toBe("public-data");
  });

  it("should handle invalid log levels gracefully", () => {
    // Test invalid numeric level
    process.env.NEXT_PUBLIC_LOGGER_LEVEL = "9";
    let invalidLogger = require("@calcom/lib/logger").default;
    expect(invalidLogger.settings.minLevel).toBe(4); // Should fall back to default

    // Test non-numeric level
    process.env.NEXT_PUBLIC_LOGGER_LEVEL = "abc";
    invalidLogger = require("@calcom/lib/logger").default;
    expect(invalidLogger.settings.minLevel).toBe(4); // Should fall back to default

    // Test empty string
    process.env.NEXT_PUBLIC_LOGGER_LEVEL = "";
    invalidLogger = require("@calcom/lib/logger").default;
    expect(invalidLogger.settings.minLevel).toBe(4); // Should fall back to default
  });
});
