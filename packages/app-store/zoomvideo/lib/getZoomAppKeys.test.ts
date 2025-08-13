import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetAppKeysFromSlug = vi.fn();
const mockZodParse = vi.fn();

vi.mock("zod", () => ({
  z: {
    object: vi.fn(() => ({
      parse: mockZodParse,
    })),
    string: vi.fn(() => ({})),
  },
}));

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: mockGetAppKeysFromSlug,
}));

describe("getZoomAppKeys", () => {
  let getZoomAppKeys: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import("./getZoomAppKeys");
    getZoomAppKeys = module.getZoomAppKeys;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return valid zoom app keys", async () => {
    const mockAppKeys = {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(mockAppKeys);
    mockZodParse.mockReturnValueOnce(mockAppKeys);

    const result = await getZoomAppKeys();

    expect(mockGetAppKeysFromSlug).toHaveBeenCalledWith("zoom");
    expect(mockZodParse).toHaveBeenCalledWith(mockAppKeys);
    expect(result).toEqual(mockAppKeys);
  });

  it("should handle missing app keys", async () => {
    mockGetAppKeysFromSlug.mockResolvedValueOnce(null);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("Invalid app keys");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("Invalid app keys");
    expect(mockGetAppKeysFromSlug).toHaveBeenCalledWith("zoom");
  });

  it("should validate schema with missing client_id", async () => {
    const invalidAppKeys = {
      client_secret: "test-client-secret",
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(invalidAppKeys);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("client_id is required");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("client_id is required");
  });

  it("should validate schema with missing client_secret", async () => {
    const invalidAppKeys = {
      client_id: "test-client-id",
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(invalidAppKeys);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("client_secret is required");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("client_secret is required");
  });

  it("should validate schema with empty strings", async () => {
    const invalidAppKeys = {
      client_id: "",
      client_secret: "",
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(invalidAppKeys);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("client_id cannot be empty");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("client_id cannot be empty");
  });

  it("should validate schema with non-string values", async () => {
    const invalidAppKeys = {
      client_id: 123,
      client_secret: true,
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(invalidAppKeys);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("client_id must be a string");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("client_id must be a string");
  });

  it("should handle getAppKeysFromSlug rejection", async () => {
    mockGetAppKeysFromSlug.mockRejectedValueOnce(new Error("Failed to fetch app keys"));

    await expect(getZoomAppKeys()).rejects.toThrow("Failed to fetch app keys");
    expect(mockGetAppKeysFromSlug).toHaveBeenCalledWith("zoom");
  });

  it("should handle extra properties in app keys", async () => {
    const appKeysWithExtra = {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      extra_property: "should-be-ignored",
    };

    const expectedResult = {
      client_id: "test-client-id",
      client_secret: "test-client-secret",
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(appKeysWithExtra);
    mockZodParse.mockReturnValueOnce(expectedResult);

    const result = await getZoomAppKeys();

    expect(result).toEqual(expectedResult);
    expect(result).not.toHaveProperty("extra_property");
  });

  it("should handle null values in app keys", async () => {
    const invalidAppKeys = {
      client_id: null,
      client_secret: null,
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(invalidAppKeys);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("client_id cannot be null");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("client_id cannot be null");
  });

  it("should handle undefined values in app keys", async () => {
    const invalidAppKeys = {
      client_id: undefined,
      client_secret: undefined,
    };

    mockGetAppKeysFromSlug.mockResolvedValueOnce(invalidAppKeys);
    mockZodParse.mockImplementationOnce(() => {
      throw new Error("client_id is required");
    });

    await expect(getZoomAppKeys()).rejects.toThrow("client_id is required");
  });
});
