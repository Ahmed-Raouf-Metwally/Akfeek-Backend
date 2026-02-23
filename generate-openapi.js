const fs = require('fs');
const swaggerSpec = require('./src/config/swagger');

try {
    const paths = Object.keys(swaggerSpec.paths || {});
    const pathCount = paths.length;
    const tagCount = (swaggerSpec.tags || []).length;
    console.log(`Successfully generated openapi.json with ${pathCount} paths and ${tagCount} tags.`);
    console.log('Included paths:', paths.sort());

    fs.writeFileSync('openapi.json', JSON.stringify(swaggerSpec, null, 2));
    console.log('File written to openapi.json');
} catch (error) {
    console.error('Error generating openapi.json:', error);
    process.exit(1);
}


