import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api/v1';

async function simpleTest() {
  try {
    console.log('🔐 Testing login...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'john@example.com',
      password: 'guest123'
    });
    
    console.log('✅ Login successful');
    console.log('Token:', loginResponse.data.token ? 'Present' : 'Missing');
    
    const token = loginResponse.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Test hotel services bookings
    console.log('\n📋 Testing hotel services bookings...');
    try {
      const response = await axios.get(`${BASE_URL}/hotel-services/bookings`, { headers });
      console.log('✅ Hotel services bookings working');
    } catch (error) {
      console.log('❌ Hotel services bookings failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Test notifications preferences
    console.log('\n📋 Testing notifications preferences...');
    try {
      const response = await axios.get(`${BASE_URL}/notifications/preferences`, { headers });
      console.log('✅ Notifications preferences working');
    } catch (error) {
      console.log('❌ Notifications preferences failed:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.status, error.response?.data?.message || error.message);
  }
}

simpleTest();
