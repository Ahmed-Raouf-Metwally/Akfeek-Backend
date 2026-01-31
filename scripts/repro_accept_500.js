const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// IDs from the successful run
const BROADCAST_ID = 'beecd070-8ae2-408f-a5fc-ad9640dc99a3'; // Update if needed
const OFFER_ID = 'ffacd7ba-2f62-478d-993f-26994a46449c'; // Update if needed
const CUSTOMER_EMAIL = 'test.customer.1769874998558@akfeek.com';
const CUSTOMER_PASSWORD = 'Password123!';

async function runRepro() {
    try {
        console.log('🚀 Starting Repro for 500 Error...\n');

        // 1. Login to get fresh token
        console.log('1️⃣ Logging in as Customer...');
        const authRes = await axios.post(`${API_URL}/auth/login`, {
            identifier: CUSTOMER_EMAIL,
            password: CUSTOMER_PASSWORD
        });
        const token = authRes.data.data.token;
        console.log('✅ Logged In');

        // 2. Try Accept
        console.log(`\n2️⃣ Accepting Offer: ${OFFER_ID} for Broadcast: ${BROADCAST_ID}...`);

        try {
            const res = await axios.post(
                `${API_URL}/bookings/carwash/${BROADCAST_ID}/offers/${OFFER_ID}/accept`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('✅ Success?!', res.data);
        } catch (apiError) {
            console.error('❌ API Error Status:', apiError.response?.status);
            console.error('❌ API Error Data:', JSON.stringify(apiError.response?.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Script Error:', error.message);
    }
}

runRepro();
