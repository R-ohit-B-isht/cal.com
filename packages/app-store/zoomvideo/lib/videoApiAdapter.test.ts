/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import VideoApiAdapter from "./VideoApiAdapter";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_LOGGER_LEVEL?: string;
    }
  }
}

describe("VideoApiAdapter Logging", () => {
  // Mock the logger functions and their implementations
  const mockDebug = vi.spyOn(logger, "debug");
  const mockInfo = vi.spyOn(logger, "info");
  const mockWarn = vi.spyOn(logger, "warn");
  const mockError = vi.spyOn(logger, "error");
  const mockGetSubLogger = vi.spyOn(logger, "getSubLogger").mockReturnValue({
    debug: mockDebug,
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.NEXT_PUBLIC_LOGGER_LEVEL;
  });

  afterEach(() => {
    // Reset environment variables after each test
    delete process.env.NEXT_PUBLIC_LOGGER_LEVEL;
  });

  it("should default to info logging level when NEXT_PUBLIC_LOGGER_LEVEL is not set", () => {
    // Arrange
    delete process.env.NEXT_PUBLIC_LOGGER_LEVEL;
    const adapter = VideoApiAdapter({} as any);

    // Act - trigger a log by calling getUserSettings which uses log.error
    adapter.getAvailability();

    // Assert - debug should not be called, but error should be
    expect(mockDebug).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
  });

  it("should create sublogger with correct prefix", () => {
    // Arrange
    const adapter = VideoApiAdapter({} as any);

    // Act - trigger getAvailability which uses the sublogger
    adapter.getAvailability();

    // Assert - check that getSubLogger was called with correct prefix
    expect(mockGetSubLogger).toHaveBeenCalledWith({
      prefix: ["app-store/zoomvideo/lib/VideoApiAdapter"],
    });
  });

  it("should log errors with safeStringify", () => {
    // Arrange
    const adapter = VideoApiAdapter({} as any);
    const error = new Error("Test error");

    // Act - trigger getAvailability which uses log.error
    adapter.getAvailability();

    // Assert - error should be called with safeStringify
    expect(mockError).toHaveBeenCalledWith(
      "Failed to retrieve zoom user settings",
      expect.stringContaining("{")
    );
  });

  it("should enable debug logging when NEXT_PUBLIC_LOGGER_LEVEL is set to 0", () => {
    // Arrange
    process.env.NEXT_PUBLIC_LOGGER_LEVEL = "0";
    const adapter = VideoApiAdapter({} as any);

    // Act - trigger isTokenObjectUnusable which uses debug logging
    adapter.getAvailability();

    // Assert - debug should be called
    expect(mockDebug).toHaveBeenCalled();
  });

  it("should suppress debug logging when NEXT_PUBLIC_LOGGER_LEVEL is set to 3 (info)", () => {
    // Arrange
    process.env.NEXT_PUBLIC_LOGGER_LEVEL = "3";
    const adapter = VideoApiAdapter({} as any);

    // Act - trigger isTokenObjectUnusable which uses debug logging
    adapter.getAvailability();

    // Assert - debug should not be called, but error should be
    expect(mockDebug).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
  });
});
