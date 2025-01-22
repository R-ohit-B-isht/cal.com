import { describe, expect, it, vi } from "vitest";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";
import { getZoomAppKeys } from "../getZoomAppKeys";

// Mock the getAppKeysFromSlug utility
vi.mock("../../../_utils/getAppKeysFromSlug", () => ({
  default: vi.fn(),
}));

describe("getZoomAppKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return valid zoom app keys", async () => {
    const mockKeys = {
      client_id: "test_client_id",
      client_secret: "test_client_secret",
    };

    (getAppKeysFromSlug as jest.Mock).mockResolvedValue(mockKeys);

    const result = await getZoomAppKeys();
    expect(result).toEqual(mockKeys);
    expect(getAppKeysFromSlug).toHaveBeenCalledWith("zoom");
  });

  it("should throw error if keys are invalid", async () => {
    const mockInvalidKeys = {
      client_id: null,
      client_secret: undefined,
    };

    (getAppKeysFromSlug as jest.Mock).mockResolvedValue(mockInvalidKeys);

    await expect(getZoomAppKeys()).rejects.toThrow();
  });

  it("should throw error if missing required keys", async () => {
    const mockIncompleteKeys = {
      client_id: "test_client_id",
      // missing client_secret
    };

    (getAppKeysFromSlug as jest.Mock).mockResolvedValue(mockIncompleteKeys);

    await expect(getZoomAppKeys()).rejects.toThrow();
  });
});
