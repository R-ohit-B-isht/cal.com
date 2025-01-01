import { vi } from "vitest";

import { TokenStatus } from "@calcom/app-store/_utils/oauth/tokenManager";

export const createResponse = (data: Record<string, unknown>, status = 200) => {
  const response = new Response(JSON.stringify(data), { status });
  return {
    tokenStatus: TokenStatus.VALID,
    response,
  };
};

export const createProxiedResponse = (data: Record<string, unknown>, status = 200) => {
  const response = new Response(JSON.stringify(data), { status });
  return new Proxy(response, {
    get(target, prop) {
      if (prop === "clone") {
        return () => createProxiedResponse(data, status);
      }
      if (prop === "json") {
        return () => Promise.resolve(data);
      }
      return target[prop as keyof Response];
    },
  });
};

const _defaultTokenData = {
  access_token: "test_access_token",
  token_type: "bearer",
  refresh_token: "test_refresh_token",
  expires_in: 3600,
};

const defaultUserSettings = {
  feature: {
    meeting_capacity: 100,
  },
};

const defaultMeetingResponse = {
  id: "123456789",
  join_url: "https://zoom.us/j/123456789",
  password: "password123",
};

export const parseBody = (body: Record<string, unknown>) => {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
};

// Mock fetch globally
vi.stubGlobal(
  "fetch",
  vi.fn((url: string, options: RequestInit) => {
    if (url.includes("/users/me/settings")) {
      return Promise.resolve(createProxiedResponse(defaultUserSettings));
    }

    if (url.includes("/meetings")) {
      const method = options.method || "GET";
      if (method === "POST" || method === "PATCH") {
        return Promise.resolve(createProxiedResponse(defaultMeetingResponse));
      }
      if (method === "DELETE") {
        return Promise.resolve(createProxiedResponse({}, 204));
      }
    }

    return Promise.resolve(createProxiedResponse({}));
  })
);
