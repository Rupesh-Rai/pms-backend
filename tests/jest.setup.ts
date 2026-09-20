// tests/jest.setup.ts
import { jest } from '@jest/globals';

// Mock BullMQ to prevent network connection attempts
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest
      .fn<(...args: any[]) => Promise<{ id: string }>>()
      .mockResolvedValue({ id: 'mock-job-id' }),

    close: jest
      .fn<(...args: any[]) => Promise<boolean>>()
      .mockResolvedValue(true),
  })),

  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),

    close: jest
      .fn<(...args: any[]) => Promise<boolean>>()
      .mockResolvedValue(true),
  })),
}));

// Mock ioredis
