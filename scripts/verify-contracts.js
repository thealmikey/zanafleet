#!/usr/bin/env node
/**
 * Verify that @zanafleet/contracts can be resolved and exports expected types.
 * Run this as a pre-commit check to catch resolution failures early.
 *
 * Usage:
 *   node scripts/verify-contracts.js
 *   npm run verify:contracts
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIST = path.join(ROOT, 'packages/contracts/dist');

console.log('🔍 Verifying @zanafleet/contracts resolution...\n');

// Step 1: Ensure contracts package is built
if (!fs.existsSync(path.join(CONTRACTS_DIST, 'index.js'))) {
  console.log('📦 Building @zanafleet/contracts...');
  try {
    execSync('npm --workspace @zanafleet/contracts run build', {
      stdio: 'inherit',
      cwd: ROOT,
    });
  } catch (err) {
    console.error('❌ Failed to build @zanafleet/contracts');
    process.exit(1);
  }
}

// Step 2: Try to require the contracts package
console.log('✓ Checking exports from @zanafleet/contracts...');
try {
  // Use require.resolve to verify module resolution
  const contractsPath = require.resolve('@zanafleet/contracts', { paths: [ROOT] });
  console.log(`  📍 Resolved to: ${contractsPath}`);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const contracts = require(contractsPath);

  // Check that DeliveryStatus is exported and defined
  if (typeof contracts.DeliveryStatus === 'undefined') {
    throw new Error('DeliveryStatus is not exported from @zanafleet/contracts');
  }

  const deliveryStatusValues = Object.keys(contracts.DeliveryStatus);
  console.log(`  ✓ DeliveryStatus is defined (${deliveryStatusValues.length} values)`);

  // Check OrderStatus if available
  if (contracts.OrderStatus !== undefined) {
    const orderStatusValues = Object.keys(contracts.OrderStatus);
    console.log(`  ✓ OrderStatus is defined (${orderStatusValues.length} values)`);
  }

  console.log('\n✅ @zanafleet/contracts verified successfully!\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Failed to verify @zanafleet/contracts:', err.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Run: npm --workspace @zanafleet/contracts run build');
  console.error('  2. Ensure packages/contracts/dist/index.js exists');
  console.error('  3. Check packages/contracts/package.json exports field\n');
  process.exit(1);
}
