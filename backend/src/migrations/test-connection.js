import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://mukulraj756_db_user:ON3QqOsVRFpGRf3C@cluster0.bvtjhii.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB Atlas connection...');
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas');
    console.log(`📍 Database name: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('📋 Collections:');
      collections.forEach(col => console.log(`   - ${col.name}`));
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    console.log('✅ Connection test successful!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();