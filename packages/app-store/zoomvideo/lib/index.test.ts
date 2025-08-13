import { describe, it, expect } from "vitest";

describe("zoomvideo lib index", () => {
  it("should export getZoomAppKeys function", async () => {
    const module = await import("./index");
    expect(module.getZoomAppKeys).toBeDefined();
    expect(typeof module.getZoomAppKeys).toBe("function");
  });

  it("should export VideoApiAdapter as default", async () => {
    const module = await import("./index");
    expect((module as any).default).toBeDefined();
    expect(typeof (module as any).default).toBe("function");
  });

  it("should export VideoApiAdapter with named export", async () => {
    const module = await import("./index");
    expect((module as any).VideoApiAdapter).toBeDefined();
    expect(typeof (module as any).VideoApiAdapter).toBe("function");
  });

  it("should have consistent exports", async () => {
    const module = await import("./index");
    expect((module as any).default).toBe((module as any).VideoApiAdapter);
  });

  it("should export all expected members", async () => {
    const module = await import("./index");
    const exportedKeys = Object.keys(module);
    
    expect(exportedKeys).toContain("getZoomAppKeys");
    expect(exportedKeys.length).toBeGreaterThanOrEqual(1);
  });

  it("should not export undefined values", async () => {
    const module = await import("./index");
    
    expect(module.getZoomAppKeys).not.toBeUndefined();
  });

  it("should maintain function signatures", async () => {
    const module = await import("./index");
    
    expect(module.getZoomAppKeys.length).toBe(0);
  });
});
