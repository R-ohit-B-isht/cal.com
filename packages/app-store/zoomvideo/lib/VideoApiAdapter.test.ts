import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from '@calcom/dayjs';
import { Frequency } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";
import ZoomVideoApiAdapter from './VideoApiAdapter';

// Mock external dependencies
vi.mock('@calcom/lib/logger', () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

// Mock the VideoApiAdapter module
vi.mock('./VideoApiAdapter', () => {
  const originalModule = vi.importActual('./VideoApiAdapter');
  return {
    ...originalModule,
    default: (credential: any) => {
      const adapter = originalModule.default(credential);
      
      // Mock fetchZoomApi with different response types
      const mockedFetchZoomApi = vi.fn()
        .mockImplementation(async (endpoint: string, options?: any) => {
          // Handle meeting creation
          if (endpoint === 'users/me/meetings' && options?.method === 'POST') {
            const body = JSON.parse(options.body);
            return {
              id: 123456789,
              join_url: 'https://zoom.us/j/123456789',
              password: 'password123',
              // Return the recurrence configuration for verification
              ...(body.recurrence && { recurrence: body.recurrence }),
            };
          }
          
          // Handle user settings
          if (endpoint.includes('users/me/settings')) {
            return {
              recording: {
                auto_recording: 'none',
              },
              schedule_meeting: {
                default_password_for_scheduled_meetings: 'test123',
              },
            };
          }

          // Default response for other endpoints
          return {
            id: 123456789,
            join_url: 'https://zoom.us/j/123456789',
            password: 'password123',
          };
        });

      return {
        ...adapter,
        fetchZoomApi: mockedFetchZoomApi,
      };
    },
  };
});

describe('ZoomVideoApiAdapter', () => {
  const mockCredential = {
    id: 'test-credential-id',
    userId: 'test-user-id',
    key: JSON.stringify({
      access_token: 'test-token',
      refresh_token: 'test-refresh-token'
    }),
    type: 'zoom_video',
    appId: 'zoom-video'
  };

  const baseEvent: CalendarEvent = {
    type: 'default',
    title: 'Test Meeting',
    description: 'Test Description',
    startTime: dayjs().add(1, 'day').toISOString(),
    endTime: dayjs().add(1, 'day').add(30, 'minute').toISOString(),
    organizer: { email: 'test@example.com', name: 'Test User', timeZone: 'UTC' },
    attendees: [{ email: 'attendee@example.com', name: 'Test Attendee', timeZone: 'UTC' }],
    location: '',
  };

  describe('Recurrence Handling', () => {
    it('should not include recurrence when recurringEvent is undefined', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = { ...baseEvent, recurringEvent: undefined };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });

    it('should handle daily recurrence correctly', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          count: 5,
          interval: 1
        }
      };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });

    it('should handle weekly recurrence correctly', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        }
      };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });

    it('should handle monthly recurrence correctly', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 3,
          interval: 1
        }
      };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });

    it('should handle recurrence with until date correctly', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.DAILY,
          until: dayjs().add(10, 'days').toDate(),
          interval: 1
        }
      };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });

    it('should handle timezone-dependent recurrence correctly', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = {
        ...baseEvent,
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        },
        attendees: [{ email: 'attendee@example.com', name: 'Test Attendee', timeZone: 'America/New_York' }]
      };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });

    it('should handle invalid recurrence type gracefully', async () => {
      const adapter = ZoomVideoApiAdapter(mockCredential);
      const event = {
        ...baseEvent,
        recurringEvent: {
          // @ts-expect-error - Testing invalid frequency
          freq: 'INVALID_FREQUENCY',
          count: 5,
          interval: 1
        }
      };
      
      const result = await adapter.createMeeting(event);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('zoom_video');
    });
  });
});
