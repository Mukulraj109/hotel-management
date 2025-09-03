import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL || process.env.MONGO_URI);
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const fixIndexes = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Drop the problematic accountId index
    try {
      await db.collection('chartofaccounts').dropIndex('accountId_1');
      console.log('Successfully dropped accountId_1 index');
    } catch (error) {
      console.log('Index accountId_1 not found or already dropped');
    }
    
    // List current indexes to verify
    const indexes = await db.collection('chartofaccounts').indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

fixIndexes();