import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import logger from "@calcom/lib/logger";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_LOGGER_LEVEL?: string;
    }
  }
}

describe("Logger Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_LOGGER_LEVEL;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("Default Behavior", () => {
    it("should default to level 3 (info) when NEXT_PUBLIC_LOGGER_LEVEL is not set", () => {
      const mockConsole = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      jest.spyOn(console, "debug").mockImplementation(mockConsole.debug);
      jest.spyOn(console, "info").mockImplementation(mockConsole.info);
      jest.spyOn(console, "warn").mockImplementation(mockConsole.warn);
      jest.spyOn(console, "error").mockImplementation(mockConsole.error);

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining("Info message"));
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining("Warning message"));
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Error message"));
    });
  });

  describe("Environment Configuration", () => {
    it("should respect NEXT_PUBLIC_LOGGER_LEVEL=2 and show debug logs", () => {
      process.env.NEXT_PUBLIC_LOGGER_LEVEL = "2";
      const mockConsole = {
        debug: jest.fn(),
        info: jest.fn(),
      };
      jest.spyOn(console, "debug").mockImplementation(mockConsole.debug);
      jest.spyOn(console, "info").mockImplementation(mockConsole.info);

      logger.debug("Debug message");
      logger.info("Info message");

      expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining("Debug message"));
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining("Info message"));
    });

    it("should handle invalid NEXT_PUBLIC_LOGGER_LEVEL values", () => {
      process.env.NEXT_PUBLIC_LOGGER_LEVEL = "invalid";
      const mockConsole = {
        debug: jest.fn(),
        info: jest.fn(),
      };
      jest.spyOn(console, "debug").mockImplementation(mockConsole.debug);
      jest.spyOn(console, "info").mockImplementation(mockConsole.info);

      logger.debug("Debug message");
      logger.info("Info message");

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining("Info message"));
    });
  });

  describe("Edge Cases", () => {
    it("should handle level 0 (silly) correctly", () => {
      process.env.NEXT_PUBLIC_LOGGER_LEVEL = "0";
      const mockConsole = {
        debug: jest.fn(),
        info: jest.fn(),
        silly: jest.fn(),
      };
      jest.spyOn(console, "debug").mockImplementation(mockConsole.debug);
      jest.spyOn(console, "info").mockImplementation(mockConsole.info);
      jest.spyOn(console, "log").mockImplementation(mockConsole.silly);

      logger.silly("Silly message");
      logger.debug("Debug message");
      logger.info("Info message");

      expect(mockConsole.silly).toHaveBeenCalledWith(expect.stringContaining("Silly message"));
      expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining("Debug message"));
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining("Info message"));
    });

    it("should handle level 6 (fatal) correctly", () => {
      process.env.NEXT_PUBLIC_LOGGER_LEVEL = "6";
      const mockConsole = {
        error: jest.fn(),
        info: jest.fn(),
      };
      jest.spyOn(console, "error").mockImplementation(mockConsole.error);
      jest.spyOn(console, "info").mockImplementation(mockConsole.info);

      logger.info("Info message");
      logger.fatal("Fatal message");

      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining("Fatal message"));
    });
  });

  describe("Integration with tRPC", () => {
    it("should log tRPC query errors at error level", () => {
      const mockConsole = {
        error: jest.fn(),
      };
      jest.spyOn(console, "error").mockImplementation(mockConsole.error);

      const mockTrpcContext = {
        type: "query",
        path: "test.query",
        error: new Error("Test error"),
      };

      // Simulate tRPC error logging
      logger.error("TRPC Error", mockTrpcContext);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining("TRPC Error"),
        expect.objectContaining({
          type: "query",
          path: "test.query",
        })
      );
    });
  });
});
