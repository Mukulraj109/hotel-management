import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Global test utilities
global.testUtils = {
  // Helper to create test user
  createTestUser: async (userData = {}) => {
    const User = mongoose.model('User');
    const defaultUser = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'guest',
      hotelId: new mongoose.Types.ObjectId(),
      isActive: true,
      ...userData
    };
    return await User.create(defaultUser);
  },

  // Helper to create test hotel
  createTestHotel: async (hotelData = {}) => {
    const Hotel = mongoose.model('Hotel');
    const defaultHotel = {
      name: 'Test Hotel',
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      zipCode: '12345',
      phone: '+1234567890',
      email: 'test@hotel.com',
      isActive: true,
      ...hotelData
    };
    return await Hotel.create(defaultHotel);
  },

  // Helper to create test booking
  createTestBooking: async (bookingData = {}) => {
    const Booking = mongoose.model('Booking');
    const defaultBooking = {
      hotelId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000), // +1 day
      totalAmount: 1000,
      status: 'confirmed',
      ...bookingData
    };
    return await Booking.create(defaultBooking);
  },

  // Helper to generate JWT token
  generateTestToken: (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        id: user._id,
        hotelId: user.hotelId,
        role: user.role
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }
};
