import { describe, expect, it, vi, beforeEach } from "vitest";

import getAppKeysFromSlug from "../../../_utils/getAppKeysFromSlug";
import { getZoomAppKeys } from "../getZoomAppKeys";

vi.mock("../../../_utils/getAppKeysFromSlug", () => ({
  default: vi.fn(),
}));

describe("getZoomAppKeys", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should successfully retrieve and validate zoom app keys", async () => {
    const mockKeys = {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
    };

    (getAppKeysFromSlug as jest.Mock).mockResolvedValueOnce(mockKeys);

    const result = await getZoomAppKeys();
    expect(result).toEqual(mockKeys);
    expect(getAppKeysFromSlug).toHaveBeenCalledWith("zoom");
  });

  it("should throw an error if keys are missing required fields", async () => {
    const invalidKeys = {
      client_id: "test-client-id",
      // missing client_secret
    };

    (getAppKeysFromSlug as jest.Mock).mockResolvedValueOnce(invalidKeys);

    await expect(getZoomAppKeys()).rejects.toThrow();
  });

  it("should throw an error if getAppKeysFromSlug fails", async () => {
    (getAppKeysFromSlug as jest.Mock).mockRejectedValueOnce(new Error("Failed to get keys"));

    await expect(getZoomAppKeys()).rejects.toThrow("Failed to get keys");
  });
});
