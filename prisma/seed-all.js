const { execSync } = require('child_process');
const path = require('path');

const seedGroups = [
  {
    name: '01 - Base Data',
    scripts: [
      'seed.js',
      'seed-auto-part-root-categories.js'
    ]
  },
  {
    name: '02 - Users & Roles',
    scripts: [
      'seed-technical-support.js',
      'seed-technicians.js',
      'seed-10-users-vehicles.js',
      'seed-activity.js'
    ]
  },
  {
    name: '03 - Vendors & Attachments',
    scripts: [
      'seed-18-vendors.js',
      'seed-24-vendors.js',
      'seed-comprehensive-care-vendor.js',
      'seed-18-vendors-correct-attachments.js'
    ]
  },
  {
    name: '04 - Workshops & Facilities',
    scripts: [
      'seed-workshops.js',
      'seed-18-workshops-with-services.js',
      'seed-workshops-for-comprehensive-care-vendors.js',
      'seed-mobile-workshops-for-vendors.js',
      'seed-winches-for-towing-vendors.js',
      'fix-wrong-workshops.js'
    ]
  },
  {
    name: '05 - Pricing & Services',
    scripts: [
      'seed-workshop-services-with-prices.js',
      'seed-5-services-per-comprehensive-care.js',
      'seed-5-services-per-mobile-workshop.js',
      'seed-mobile-workshop-flow-data.js'
    ]
  },
  {
    name: '06 - Bookings & Transactions',
    scripts: [
      'seed-workshops-vendors-bookings.js',
      'seed-completed-bookings-for-vendors.js',
      'seed-5-users-10-bookings-paid.js',
      'seed-10-users-3-vendor-requests-7-bookings-paid.js',
      'seed_feedback.js'
    ]
  },
  {
    name: '07 - Financials & Wallets',
    scripts: [
      'seed-backfill-vendor-wallet-paid-invoices.js'
    ]
  }
];

async function main() {
  console.log('🚀 Starting the consolidated database seeding process...\n');

  for (const group of seedGroups) {
    console.log(`\n========================================`);
    console.log(`🗂️  Running Group: ${group.name}`);
    console.log(`========================================\n`);
    for (const script of group.scripts) {
      console.log(`⏳ Running ${script}...`);
      try {
        const { execFileSync } = require('child_process');
        execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
        console.log(`✅ Successfully completed ${script}\n`);
      } catch (error) {
        console.error(`❌ Failed to run ${script}`);
        console.error(`Error details: ${error.message}`);
        process.exit(1);
      }
    }
  }

  console.log('\n🎉 All seeding scripts completed successfully!');
}

main().catch((error) => {
  console.error('An unexpected error occurred during seeding:', error);
  process.exit(1);
});
