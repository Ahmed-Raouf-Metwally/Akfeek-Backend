const fs = require('fs');
const swaggerSpec = require('./src/config/swagger');

try {
    fs.writeFileSync('openapi.json', JSON.stringify(swaggerSpec, null, 2));
    console.log('Successfully generated openapi.json');
} catch (error) {
    console.error('Error generating openapi.json:', error);
    process.exit(1);
}
