// Clear all worldbank-admin bases from the database
// Usage: node clear-worldbank-admin.js

const apiUrl = 'https://staging.d2l8hlr3sei3te.amplifyapp.com';

async function clearWorldBankAdminBases() {
  console.log('🗑️  CLEARING WORLDBANK-ADMIN BASES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Get all bases
    console.log('📋 Fetching all worldbank-admin bases...');
    const basesResponse = await fetch(`${apiUrl}/api/worldbank-base`);

    if (!basesResponse.ok) {
      throw new Error(`Failed to fetch bases: ${basesResponse.status} ${basesResponse.statusText}`);
    }

    const bases = await basesResponse.json();
    console.log(`   Found ${bases.length} worldbank-admin base(s)\n`);

    if (bases.length === 0) {
      console.log('✅ No bases to delete. Database is already clear!');
      return;
    }

    // 2. Delete each base
    for (const base of bases) {
      console.log(`🗑️  Deleting base: ${base.name} (${base.id})`);

      const deleteResponse = await fetch(`${apiUrl}/api/worldbank-base/${base.id}`, {
        method: 'DELETE',
      });

      if (deleteResponse.ok) {
        console.log(`   ✅ Deleted successfully`);
      } else {
        console.log(`   ❌ Failed: ${deleteResponse.status} ${deleteResponse.statusText}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ DONE! All worldbank-admin bases have been deleted.');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

clearWorldBankAdminBases();
