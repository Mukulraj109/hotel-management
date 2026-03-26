import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Apply timeout immediately for all tests/hooks in this runtime.
jest.setTimeout(120000);
let replset;

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Start in-memory replica set so transaction-based tests can run.
  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.14' }
  });
  const mongoUri = replset.getUri();
  process.env.MONGO_URI = mongoUri;
});

// Global test teardown
afterAll(async () => {
  // Close any remaining connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replset) {
    await replset.stop();
  }
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
