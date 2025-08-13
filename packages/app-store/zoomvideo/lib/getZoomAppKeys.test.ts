import { expect, test, vi, describe } from "vitest";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { getZoomAppKeys } from "./getZoomAppKeys";

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: vi.fn(),
}));

const mockGetAppKeysFromSlug = vi.mocked(getAppKeysFromSlug);

describe("getZoomAppKeys", () => {
  test("Successfully retrieves and validates Zoom app keys", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "test_client_id",
      client_secret: "test_client_secret",
    });

    const result = await getZoomAppKeys();

    expect(mockGetAppKeysFromSlug).toHaveBeenCalledWith("zoom");
    expect(result).toEqual({
      client_id: "test_client_id",
      client_secret: "test_client_secret",
    });
  });

  test("Throws error when app keys are missing required fields", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "test_client_id",
    });

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Throws error when client_secret is missing", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_secret: "test_client_secret",
    });

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Throws error when app keys are invalid format", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      invalid: "format",
    });

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Throws error when app keys are null", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue(null);

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Throws error when app keys are undefined", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue(undefined);

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Handles getAppKeysFromSlug failure", async () => {
    mockGetAppKeysFromSlug.mockRejectedValue(new Error("Failed to fetch app keys"));

    await expect(() => getZoomAppKeys()).rejects.toThrowError("Failed to fetch app keys");
  });

  test("Validates client_id is string", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: 123,
      client_secret: "test_client_secret",
    });

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Validates client_secret is string", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "test_client_id",
      client_secret: 456,
    });

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Handles empty string values", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "",
      client_secret: "",
    });

    await expect(() => getZoomAppKeys()).rejects.toThrow();
  });

  test("Handles extra properties in response", async () => {
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "test_client_id",
      client_secret: "test_client_secret",
      extra_property: "should_be_ignored",
    });

    const result = await getZoomAppKeys();

    expect(result).toEqual({
      client_id: "test_client_id",
      client_secret: "test_client_secret",
    });
  });

  test("Handles network timeout error", async () => {
    mockGetAppKeysFromSlug.mockRejectedValue(new Error("Network timeout"));

    await expect(() => getZoomAppKeys()).rejects.toThrowError("Network timeout");
  });

  test("Handles authentication error", async () => {
    mockGetAppKeysFromSlug.mockRejectedValue(new Error("Authentication failed"));

    await expect(() => getZoomAppKeys()).rejects.toThrowError("Authentication failed");
  });
});
