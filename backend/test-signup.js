const axios = require('axios');

async function testSignup() {
  try {
    console.log('\n🧪 Testing Signup API...\n');
    
    const response = await axios.post('http://localhost:5000/api/auth/signup', {
      email: 'rishiatole4545@gmail.com',
      phone: '+917045215685',
      password: 'SecurePass123!',
      firstName: 'Hrishikesh',
      lastName: 'Atole'
    });

    console.log('✅ Signup Successful!');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Signup Failed!');
      console.log('\nError Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ No response from server!');
      console.log('Error:', error.message);
      console.log('\nIs the server running on http://localhost:5000?');
    } else {
      console.log('❌ Request Failed:', error.message);
      console.log('Stack:', error.stack);
    }
  }
}

testSignup();
