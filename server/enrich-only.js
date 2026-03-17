import { execSync } from 'child_process';

function run(command) {
    console.log(`\n🚀 Running: ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (e) {
        console.error(`❌ Error running ${command}:`, e.message);
    }
}

async function main() {
    console.log('\n💎 STARTING DATA ENRICHMENT ONLY (SKIPPING SCRAPING)\n');

    // Stage 1: Category Cleanup
    console.log('\n📦 AŞAMA 1: Kategorileri Düzenleme');
    run('node cleanup_categories.js');

    // Stage 2: Muadil Matching
    console.log('\n📦 AŞAMA 2: Muadil (Eş) Ürünleri Bağlama (Aggressive Mode: 0.65)');
    run('node muadil_matcher.js');

    // Stage 3: Barcode Fetching
    console.log('\n📦 AŞAMA 3: Eksik Barkodların Tamamlanması (HEPSİ - Ultra-Minimal Search)');
    run('node fetch_missing_barcodes.js');

    // Stage 4: Deduplication
    console.log('\n📦 AŞAMA 4: Tekilleştirme (Deduplication)');
    run('node dedup-db.js');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ENRICHMENT COMPLETE!');
    console.log('='.repeat(60));
}

main().catch(console.error);
