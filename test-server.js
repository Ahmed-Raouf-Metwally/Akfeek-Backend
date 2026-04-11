require('dotenv').config();
console.log('Starting server test...');

try {
  const prisma = require('./src/utils/database/prisma');
  console.log('Prisma loaded');
  
  const app = require('./src/app');
  console.log('App loaded');
  
  console.log('All imports successful - checking if server can start...');
  process.exit(0);
} catch (err) {
  console.error('ERROR:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}