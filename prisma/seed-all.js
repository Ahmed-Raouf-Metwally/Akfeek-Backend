const { execSync } = require('child_process');
const path = require('path');

const seedScripts = [
  'seed.js',
  'seed-activity.js',
  'seed-comprehensive-care-vendor.js',
  'seed-technical-support.js',
  'seed-technicians.js',
  'seed-workshops.js',
  'seed_feedback.js',
];

async function main() {
  console.log('🚀 Starting the consolidated database seeding process...\n');

  for (const script of seedScripts) {
    console.log(`\n⏳ Running ${script}...`);
    try {
      execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit' });
      console.log(`✅ Successfully completed ${script}`);
    } catch (error) {
      console.error(`❌ Failed to run ${script}`);
      console.error(`Error details: ${error.message}`);
      process.exit(1);
    }
  }

  console.log('\n🎉 All seeding scripts completed successfully!');
}

main().catch((error) => {
  console.error('An unexpected error occurred during seeding:', error);
  process.exit(1);
});
