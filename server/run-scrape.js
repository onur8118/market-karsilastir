import { runAllScrapers, runSingleScraper } from './scrapers/index.js';

const arg = process.argv[2];

if (arg) {
    console.log(`📡 FiyatRadar — Manuel Scrape Başlatıldı: ${arg}\n`);
    runSingleScraper(arg)
        .then(() => {
            console.log(`\n✅ ${arg} işlemi tamamlandı.`);
            process.exit(0);
        })
        .catch(err => {
            console.error(`❌ ${arg} hatası:`, err);
            process.exit(1);
        });
} else {
    console.log('📡 FiyatRadar — Tüm Scrape İşlemleri Başlatıldı\n');
    runAllScrapers()
        .then(() => {
            console.log('\n✅ Tüm scrape işlemleri tamamlandı.');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Scrape hatası:', err);
            process.exit(1);
        });
}
