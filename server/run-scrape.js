import { runAllScrapers } from './scrapers/index.js';

console.log('📡 FiyatRadar — Manuel Scrape Başlatıldı\n');

runAllScrapers()
    .then(() => {
        console.log('\n✅ Tüm scrape işlemleri tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Scrape hatası:', err);
        process.exit(1);
    });
