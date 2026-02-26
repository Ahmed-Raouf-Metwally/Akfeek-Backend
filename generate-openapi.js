const fs = require('fs');
const path = require('path');

const { fullSpec, mobileSpec, technicianSpec, vendorSpec, adminSpec } = require('./src/config/swagger');

const SPECS = [
  { name: 'openapi',           spec: fullSpec,        label: '🌐 Full API' },
  { name: 'openapi-mobile',    spec: mobileSpec,      label: '📱 Mobile (Customer)' },
  { name: 'openapi-technician',spec: technicianSpec,  label: '🔧 Technician' },
  { name: 'openapi-vendor',    spec: vendorSpec,       label: '🏪 Vendor' },
  { name: 'openapi-admin',     spec: adminSpec,        label: '⚙️ Admin Dashboard' },
];

let hasError = false;

for (const { name, spec, label } of SPECS) {
  try {
    const pathCount  = Object.keys(spec.paths  || {}).length;
    const tagCount   = (spec.tags  || []).length;
    const filename   = `${name}.json`;

    fs.writeFileSync(filename, JSON.stringify(spec, null, 2), 'utf-8');

    console.log(`✅ ${label.padEnd(30)} → ${filename.padEnd(30)} (${pathCount} paths, ${tagCount} tags)`);
  } catch (err) {
    console.error(`❌ Failed to write ${name}:`, err.message);
    hasError = true;
  }
}

console.log('\n📋 Endpoint count per spec:');
for (const { name, spec, label } of SPECS) {
  const endpoints = Object.values(spec.paths || {})
    .flatMap(methods => Object.keys(methods))
    .length;
  console.log(`   ${label.padEnd(30)} ${endpoints} endpoints`);
}

if (!hasError) {
  console.log('\n🎉 All OpenAPI specs generated successfully!');
} else {
  process.exit(1);
}
