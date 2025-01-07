import { vi } from 'vitest';
import { beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as any;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Mock environment variables
process.env = {
  ...process.env,
  ZOOM_CLIENT_ID: 'test-client-id',
  ZOOM_CLIENT_SECRET: 'test-client-secret',
};
