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
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn<(...args: any[]) => Promise<null>>().mockResolvedValue(null),
    set: jest.fn<(...args: any[]) => Promise<string>>().mockResolvedValue('OK'),
    del: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(1),
    on: jest.fn(),
    connect: jest
      .fn<(...args: any[]) => Promise<boolean>>()
      .mockResolvedValue(true),
    disconnect: jest
      .fn<(...args: any[]) => Promise<boolean>>()
      .mockResolvedValue(true),
  }));
});
