const axios = require('axios');

async function checkStatus() {
    try {
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            identifier: 'tech1@akfeek.com',
            password: 'Admin123!'
        });
        const token = loginRes.data.data.token;

        const jobsRes = await axios.get('http://localhost:3001/api/technician/towing/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const job = jobsRes.data.data.jobs.find(j => j.id === '64659ffe-ae01-4d34-b556-4faf10e81c50');
        if (job) {
            console.log('Current Job Status:', job.status);
        } else {
            console.log('Job not found in active list');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkStatus();
