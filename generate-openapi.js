/**
 * يصدّر مواصفات OpenAPI (Swagger) إلى ملف JSON لاستيراده في Postman أو أي عميل API.
 * التشغيل: npm run openapi
 * الملف الناتج: openapi.json (في جذر المشروع)
 *
 * استيراد في Postman:
 * 1. File → Import
 * 2. اختر openapi.json أو أدخل الرابط: http://localhost:3000/api-docs.json (مع تشغيل السيرفر)
 */
const path = require('path');
const fs = require('fs');

// التحميل من مجلد المشروع (نفس مسار package.json)
process.chdir(__dirname);

const swaggerSpec = require('./src/config/swagger');
const outputPath = path.join(__dirname, 'openapi.json');

const json = JSON.stringify(swaggerSpec, null, 2);

fs.writeFileSync(outputPath, json, 'utf8');
console.log('✅ تم تصدير OpenAPI إلى:', outputPath);
console.log('   استورد هذا الملف في Postman: File → Import → openapi.json');
console.log('   أو استورد من الرابط (مع تشغيل السيرفر): http://localhost:3000/api-docs.json');
