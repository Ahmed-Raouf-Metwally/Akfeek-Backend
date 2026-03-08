/**
 * تشغيل كل تيستات الفلو في الموقع
 *
 * يشغّل كل سكربتات test-*-flow.js الموجودة بالترتيب ويطبع نتيجة كل واحد.
 *
 * المتطلبات:
 * - السيرفر شغال: npm run dev
 * - قاعدة البيانات: npm run prisma:seed:all (أو الـ seeds المطلوبة لكل فلو)
 *
 * الاستخدام:
 *   npm run test:all-flows
 *   node scripts/run-all-flow-tests.js
 *   SKIP_FLOWS=winch,refund node scripts/run-all-flow-tests.js   (تخطي فلوات معينة)
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

const FLOW_TESTS = [
  { key: 'comprehensive-care', name: 'العناية الشاملة (Comprehensive Care)', script: 'test-comprehensive-care-flow.js' },
  { key: 'certified-workshop', name: 'الورش المعتمدة (Certified Workshop)', script: 'test-certified-workshop-flow.js' },
  { key: 'carwash', name: 'غسيل السيارات (Car Wash)', script: 'test-carwash-flow.js' },
  { key: 'mobile-workshop', name: 'الورش المتنقلة (Mobile Workshop)', script: 'test-mobile-workshop-flow.js' },
  { key: 'winch', name: 'الوينش / السحب (Winch/Towing)', script: 'test-winch-flow.js' },
  { key: 'refund', name: 'الاستردادات (Refund)', script: 'test-refund-flow.js' },
  // سكربتات إضافية إن وُجدت (فيندور غسيل، طلبات متجر، إلخ)
  { key: 'carwash-vendor', name: 'غسيل — جانب الفيندور (Car Wash Vendor)', script: 'test-carwash-flow-vendor.js' },
];

const skipEnv = (process.env.SKIP_FLOWS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

function runOne(flow) {
  return new Promise((resolve) => {
    const scriptPath = path.join(SCRIPTS_DIR, flow.script);
    if (!fs.existsSync(scriptPath)) {
      resolve({ flow: flow.key, name: flow.name, ok: 'skip', message: 'ملف التيست غير موجود' });
      return;
    }
    if (skipEnv.includes(flow.key)) {
      resolve({ flow: flow.key, name: flow.name, ok: 'skip', message: 'مُتخطى (SKIP_FLOWS)' });
      return;
    }

    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      const ok = code === 0 ? 'pass' : 'fail';
      resolve({
        flow: flow.key,
        name: flow.name,
        ok,
        code,
        stdout: stdout.slice(-800),
        stderr: stderr.slice(-800),
      });
    });

    child.on('error', (err) => {
      resolve({ flow: flow.key, name: flow.name, ok: 'fail', message: err.message, stderr: stderr.slice(-500) });
    });
  });
}

async function main() {
  console.log('========================================');
  console.log('  تشغيل كل تيستات الفلو — أكفيك');
  console.log('========================================\n');
  console.log('Base URL:', process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000');
  if (skipEnv.length) console.log('تخطي الفلوات:', skipEnv.join(', '));
  console.log('');

  const results = [];
  for (const flow of FLOW_TESTS) {
    process.stdout.write(`  [${flow.key}] ${flow.name} ... `);
    const r = await runOne(flow);
    results.push(r);
    if (r.ok === 'pass') console.log('✅ نجح');
    else if (r.ok === 'skip') console.log('⏭️ ' + (r.message || 'تخطي'));
    else {
      console.log('❌ فشل' + (r.code != null ? ` (exit ${r.code})` : ''));
      if (r.stderr) console.log(r.stderr.split('\n').slice(-5).join('\n'));
    }
  }

  console.log('\n----------------------------------------');
  const passed = results.filter((r) => r.ok === 'pass').length;
  const failed = results.filter((r) => r.ok === 'fail').length;
  const skipped = results.filter((r) => r.ok === 'skip').length;
  console.log(`النتيجة: ${passed} نجح، ${failed} فشل، ${skipped} تخطي`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('تفاصيل الفشل:');
    results.filter((r) => r.ok === 'fail').forEach((r) => {
      console.log(`  - ${r.name}: ${r.message || r.stderr || 'انظر الأعلى'}`);
    });
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
