import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
import RoomType from './src/models/RoomType.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-management';
const HOTEL_ID = '68bc094f80c86bfe258e172b';

async function checkRoomTypes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`\n🏨 Checking room types for hotel: ${HOTEL_ID}`);
    
    // Get all room types for this hotel
    const roomTypes = await RoomType.find({ hotelId: HOTEL_ID });
    console.log(`📊 Total room types found: ${roomTypes.length}`);

    if (roomTypes.length === 0) {
      console.log('❌ No room types found for this hotel!');
      console.log('💡 This is why the dropdown is empty.');
      return;
    }

    console.log('\n📋 Room Types:');
    roomTypes.forEach((rt, index) => {
      console.log(`\n  ${index + 1}. ${rt.name} (${rt.code})`);
      console.log(`     - ID: ${rt._id}`);
      console.log(`     - Room Type ID: ${rt.roomTypeId}`);
      console.log(`     - Hotel ID: ${rt.hotelId}`);
      console.log(`     - Base Price: ${rt.currency || 'USD'} ${rt.basePrice}`);
      console.log(`     - Max Occupancy: ${rt.maxOccupancy}`);
      console.log(`     - Active: ${rt.isActive}`);
      console.log(`     - Legacy Type: ${rt.legacyType || 'N/A'}`);
      console.log(`     - Created: ${rt.createdAt}`);
    });

    // Check active room types specifically
    const activeRoomTypes = await RoomType.find({ 
      hotelId: HOTEL_ID, 
      isActive: true 
    });
    console.log(`\n✅ Active room types: ${activeRoomTypes.length}`);

    // Test the API endpoint query
    console.log('\n🔍 Testing API endpoint query...');
    const options = await RoomType.find(
      { hotelId: HOTEL_ID, isActive: true },
      'roomTypeId name code basePrice maxOccupancy legacyType'
    ).lean();
    
    console.log(`📡 API Options would return: ${options.length} records`);
    options.forEach((opt, index) => {
      console.log(`  ${index + 1}. ${opt.name} (${opt.code}) - ${opt.basePrice}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

checkRoomTypes();