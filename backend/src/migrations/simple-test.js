import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://mukulraj756_db_user:ON3QqOsVRFpGRf3C@cluster0.bvtjhii.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('🚀 Starting simple migration test...');

async function runSimpleTest() {
  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected successfully');
    
    // Try to import Room model
    console.log('📋 Importing Room model...');
    const { default: Room } = await import('../models/Room.js');
    console.log('✅ Room model imported');
    
    // Try to import RoomType model
    console.log('📋 Importing RoomType model...');
    const { default: RoomType } = await import('../models/RoomType.js');
    console.log('✅ RoomType model imported');
    
    // Create a test room
    console.log('🏨 Creating test room...');
    const testHotelId = new mongoose.Types.ObjectId();
    const testRoom = new Room({
      hotelId: testHotelId,
      roomNumber: 'TEST-101',
      type: 'single',
      baseRate: 2000,
      capacity: 1,
      isActive: true
    });
    
    await testRoom.save();
    console.log('✅ Test room created:', testRoom.roomNumber);
    
    // Create a test room type
    console.log('🏨 Creating test room type...');
    const testRoomType = new RoomType({
      hotelId: testHotelId,
      name: 'Test Single Room',
      code: 'TST',
      maxOccupancy: 1,
      basePrice: 2000,
      legacyType: 'single'
    });
    
    await testRoomType.save();
    console.log('✅ Test room type created:', testRoomType.name);
    
    // Clean up
    console.log('🧹 Cleaning up test data...');
    await Room.deleteOne({ _id: testRoom._id });
    await RoomType.deleteOne({ _id: testRoomType._id });
    console.log('✅ Cleanup completed');
    
    await mongoose.disconnect();
    console.log('📡 Disconnected from database');
    console.log('🎉 Simple test PASSED!');
    
  } catch (error) {
    console.error('❌ Simple test FAILED:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runSimpleTest();