const axios = require('axios');

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            identifier: 'tech1@akfeek.com',
            password: 'Admin123!'
        });
        const token = loginRes.data.data.token;
        console.log('Login successful. Token obtained.');

        console.log('Fetching jobs...');
        const jobsRes = await axios.get('http://localhost:3001/api/technician/towing/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Jobs fetched successfully!');
        console.log('Job Count:', jobsRes.data.data.jobs.length);
        if (jobsRes.data.data.jobs.length > 0) {
            console.log('First Job Status:', jobsRes.data.data.jobs[0].status);
        }

    } catch (e) {
        console.error('Test Failed:', e.response?.data || e.message);
    }
}

test();
