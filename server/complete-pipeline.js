import { execSync } from 'child_process';
import fs from 'fs';
import { logPipelineStats, logError } from './logger.js';

function run(stage, command) {
    console.log(`\n🚀 [${stage}] Running: ${command}`);
    const start = Date.now();
    try {
        execSync(command, { stdio: 'inherit' });
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        logPipelineStats(stage, { status: 'success', duration: `${duration}s` });
    } catch (e) {
        logError(stage, e);
    }
}

async function main() {
    // Aşama 1: Marketleri Tara (En uzun süren işlem - Asset blocking ile hızlandırıldı)
    console.log('\n📦 AŞAMA 1: Market Verilerini Çekme (Scraping)');
    run('node run-all-markets.js');

    // Aşama 2: Kategori Temizliği (Hiyerarşik mantıkla)
    console.log('\n📦 AŞAMA 2: Kategorileri Düzenleme');
    run('node cleanup_categories.js');

    // Aşama 3: Muadil Eşleştirme (Bulanık mantıkla)
    console.log('\n📦 AŞAMA 3: Muadil (Eş) Ürünleri Bağlama');
    run('node muadil_matcher.js');

    // Aşama 4: Eksik Barkodları Tamamlama (Transaction ve Concurrency ile hızlandırıldı)
    console.log('\n📦 AŞAMA 4: Eksik Barkodların Tamamlanması');
    run('node fetch_missing_barcodes.js --limit 2000');

    // Aşama 5: Veritabanı Temizliği (Tekilleştirme)
    console.log('\n📦 AŞAMA 5: Tekilleştirme (Deduplication)');
    run('node dedup-db.js');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL STAGES COMPLETE!');
    console.log('='.repeat(60));
}

main().catch(console.error);
