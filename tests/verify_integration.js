const fetch = require('node-fetch'); // Fallback if using older node, but Node 18+ has global fetch

// Helper to handle both environments
const myFetch = typeof fetch === 'function' ? fetch : async (url, options) => {
    const { default: f } = await import('node-fetch');
    return f(url, options);
};

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('⏳ Waiting 5s for server to start...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n🧪 Starting Integration Test...\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await myFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'testuser@akfeek.com', // User created in previous steps
        password: 'Test123!'
      })
    });
    
    if (!loginRes.ok) {
        // Try creating user if login fails (idempotent)
        console.log('   Login failed, trying to register...');
        const regRes = await myFetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `testuser_${Date.now()}@akfeek.com`,
                phone: `+9665${Date.now().toString().slice(-8)}`,
                password: 'Test123!',
                firstName: 'Test',
                lastName: 'User',
                role: 'CUSTOMER'
            })
        });
        const regJson = await regRes.json();
        if(!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);
        var token = regJson.data.token;
        console.log('   ✅ Registered new user');
    } else {
        const loginJson = await loginRes.json();
        var token = loginJson.data.token;
        console.log('   ✅ Login successful');
    }

    const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Services List
    console.log('\n2. Listing Services...');
    const servicesRes = await myFetch(`${BASE_URL}/services`, { headers });
    const servicesJson = await servicesRes.json();
    
    if (servicesRes.ok && servicesJson.data.length > 0) {
      console.log(`   ✅ Success: Found ${servicesJson.data.length} services`);
      console.log(`   Sample: ${servicesJson.data[0].name} (${servicesJson.data[0].category})`);
    } else {
      throw new Error(`Failed to list services: ${JSON.stringify(servicesJson)}`);
    }

    // 3. Get Vehicle Master
    console.log('\n3. Getting Vehicle Master...');
    const mastersRes = await myFetch(`${BASE_URL}/vehicles/masters?make=Toyota`, { headers });
    const mastersJson = await mastersRes.json();
    
    if (!mastersRes.ok || mastersJson.data.length === 0) {
        throw new Error('No masters found. Did you seed the db?');
    }
    const masterId = mastersJson.data[0].id;
    console.log(`   ✅ Got Master ID: ${masterId} (${mastersJson.data[0].model})`);

    // 4. Create Vehicle (Verify Fix)
    console.log('\n4. Creating Vehicle (Testing POST fix)...');
    const plate = `TST-${Math.floor(Math.random()*10000)}`;
    const createRes = await myFetch(`${BASE_URL}/vehicles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            vehicleMasterId: masterId,
            plateNumber: plate,
            color: 'Red',
            isDefault: true
        })
    });
    
    const createJson = await createRes.json();
    
    if (createRes.ok) {
        console.log(`   ✅ Vehicle Created! ID: ${createJson.data.id}`);
        console.log(`   ✅ Plate: ${createJson.data.plateNumber}`);
        console.log(`   ✅ Default: ${createJson.data.isDefault}`);
    } else {
        throw new Error(`Failed to create vehicle: ${JSON.stringify(createJson)}`);
    }

    console.log('\n🎉 ALL TESTS PASSED!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

runTest();
