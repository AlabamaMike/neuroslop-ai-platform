import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllTimers();
});

// Global test utilities
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockEnv = (env: Record<string, string>): void => {
  Object.keys(env).forEach((key) => {
    process.env[key] = env[key];
  });
};

export const cleanupEnv = (keys: string[]): void => {
  keys.forEach((key) => {
    delete process.env[key];
  });
};
