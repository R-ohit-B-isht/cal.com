declare module "@calcom/prisma/zod-utils" {
  export enum Frequency {
    YEARLY = 0,
    MONTHLY = 1,
    WEEKLY = 2,
    DAILY = 3,
    HOURLY = 4,
    MINUTELY = 5,
  }
}

declare module "@calcom/types/Calendar" {
  export interface CalendarEvent {
    type: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    organizer: {
      email: string;
      name: string;
      timeZone: string;
    };
    attendees: Array<{
      email: string;
      name: string;
      timeZone: string;
    }>;
    recurringEvent?: {
      freq: import("@calcom/prisma/zod-utils").Frequency;
      count?: number;
      interval?: number;
      until?: Date;
    };
  }
}

declare module "@calcom/types/Credential" {
  export interface CredentialPayload {
    id: number;
    type: string;
    key: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
    };
    userId: number;
    appId: string;
  }
}

declare module "vitest" {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: <T>(actual: T) => {
    toBe: (expected: T) => void;
    toBeDefined: () => void;
    toEqual: (expected: T) => void;
    toThrow: (message?: string) => void;
    resolves: {
      not: {
        toThrow: () => void;
      };
    };
    rejects: {
      toThrow: (message?: string) => void;
    };
  };
  export const vi: {
    fn: <T extends (...args: unknown[]) => unknown>(
      implementation?: T
    ) => {
      mockImplementation: (fn: T) => void;
      mockReturnValue: (value: ReturnType<T>) => void;
      mockRejectedValue: (value: unknown) => void;
      mockResolvedValue: (value: unknown) => void;
    };
    spyOn: (
      object: Record<string, unknown>,
      method: string
    ) => {
      mockImplementation: (fn: unknown) => void;
      mockReturnValue: (value: unknown) => void;
    };
    clearAllMocks: () => void;
    mock: (
      path: string,
      mockExports?: Record<string, unknown>
    ) => {
      mockImplementation: (fn: unknown) => void;
    };
  };
  export const beforeEach: (fn: () => void | Promise<void>) => void;
}

declare module "@calcom/lib/fetch" {
  export interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
  }

  export interface ResponseLike {
    ok: boolean;
    status: number;
    json(): Promise<any>;
  }

  export type FetchFn = (url: string, options?: FetchOptions) => Promise<ResponseLike>;

  export const fetch: FetchFn;
  export const Response: typeof globalThis.Response;
}

declare module "node-fetch" {
  export * from "@calcom/lib/fetch";
}

declare module "@testing-library/dom" {
  export interface Window {
    fetch: typeof fetch;
  }
}
