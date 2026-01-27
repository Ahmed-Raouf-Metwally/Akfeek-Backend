try {
    console.log('Loading server...');
    require('./src/server.js');
} catch (error) {
    console.error('=== FATAL ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:');
    console.error(error.stack);
    process.exit(1);
}
