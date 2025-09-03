import mongoose from 'mongoose';

async function checkDatabases() {
  try {
    // Connect to MongoDB without specifying a database
    await mongoose.connect('mongodb://localhost:27017');
    console.log('✅ Connected to MongoDB');
    
    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    
    console.log('📚 Available databases:');
    dbList.databases.forEach(db => {
      console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
    });
    
    // Check the test database specifically (where the data actually exists)
    console.log('\n🔍 Checking test database...');
    const testDb = mongoose.connection.useDb('test');
    
    // Get collections using the correct method
    const collections = await testDb.db.listCollections().toArray();
    
    console.log('📋 Collections in test:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check if chartofaccounts collection exists and has data
    if (collections.some(col => col.name === 'chartofaccounts')) {
      console.log('\n💰 Found chartofaccounts collection!');
      const chartOfAccounts = testDb.db.collection('chartofaccounts');
      const count = await chartOfAccounts.countDocuments();
      console.log(`📊 Total documents: ${count}`);
      
      if (count > 0) {
        const sample = await chartOfAccounts.findOne();
        console.log('📝 Sample document:', JSON.stringify(sample, null, 2));
      }
    } else {
      console.log('\n❌ chartofaccounts collection not found in test database');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabases();
