import { getDb, saveDb } from './db.js';

const PRIVATE_LABEL_BRANDS = [
    'Dost', 'Bili Bili', 'Sole', 'Kaanlar', 'Emin', 'Krinkıl', 'Centro', 'Efsane', 'Siri', 'Lezita', 'Ekmekçik', 'Destan',
    'Mis', 'Piyale', 'Mintax', 'Amigo', 'Evin', 'Lio', 'Deren', 'Vatan', 'Kumsal', 'İnci', 'Bizim Vatan',
    'Birşah', 'Vera', 'Baştacı', 'Ovadan', 'Çokça', 'Pervin', 'Torku', 'Milkten', 'Hadi', 'Migros', 'A101', 'Şok', 'Sok'
];

/**
 * İki metin arasındaki benzerlik skorunu döndürür (0-1 arası)
 */
function getSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0;

    // Basit bir kelime çakışma (overlap) algoritması
    const w1 = new Set(s1.split(' '));
    const w2 = new Set(s2.split(' '));
    const intersection = new Set([...w1].filter(x => w2.has(x)));

    return (2 * intersection.size) / (w1.size + w2.size);
}

function normalizeCoreName(name) {
    let n = name.toLowerCase();

    // Markaları temizle
    for (const brand of PRIVATE_LABEL_BRANDS) {
        n = n.replace(new RegExp('\\b' + brand.toLowerCase() + '\\b', 'g'), '');
    }

    // Teknik detayları ve gürültü kelimeleri temizle
    const noise = [
        'tam yağlı', 'yarım yağlı', 'yağlı', 'light', 'klasik', 'ekonomik', 'paket', 'fırsat', 'firsat', 'yeni', 'aktif',
        'pastörize', 'günlük', 'uht', 'laktozsuz', 'organik', 'geleneksel', 'sade', 'doğal', 'naturel',
        'homojenize', 'kaymaklı', 'taze', 'olgunlaştırılmış', 'süzme', 'suzme', 'yarım', 'tam', 'yağsız', 'yagsiz',
        'doğal', 'naturel', 'geleneksel', 'ev tipi', 'köy tipi', 'gurme', 'özel', 'ozel', 'serisi'
    ];
    for (const word of noise) {
        n = n.replace(new RegExp('\\b' + word + '\\b', 'g'), '');
    }

    // Birim ve sayıları temizle (Eşleşme için sadece çekirdek isim kalsın)
    n = n.replace(/\d+([.,]\d+)?\s*(l|ml|g|gr|kg|adet|'li|lü|lu|li|ad|cc|rulo)\b/g, '');
    n = n.replace(/%\s*\d+([.,]\d+)?/g, '');
    n = n.replace(/[\(\)\[\]]/g, '');
    n = n.replace(/\d+x\d+\b/g, '');

    return n.replace(/\s+/g, ' ').trim();
}

function extractVolume(name) {
    const match = name.toLowerCase().match(/(\d+([.,]\d+)?\s*(l|ml|g|gr|kg|adet|rulo))\b/);
    if (!match) return 'unknown';
    let vol = match[1].replace(/\s+/g, '').replace(',', '.').replace('gr', 'g');
    return vol;
}

async function match() {
    console.log('🔗 Muadil eşleştirme (Fuzzy Mode) başlatılıyor...');
    const db = await getDb(true);

    const brandsQuery = PRIVATE_LABEL_BRANDS.map(b => `'${b}'`).join(',');
    const productsResult = db.exec(`SELECT id, name, category, brand FROM products WHERE brand IN (${brandsQuery})`);

    if (!productsResult.length || !productsResult[0].values) {
        console.log('PL ürün bulunamadı.');
        return;
    }

    const products = productsResult[0].values.map(r => ({
        id: r[0],
        name: r[1],
        category: r[2],
        brand: r[3],
        core: normalizeCoreName(r[1]),
        volume: extractVolume(r[1])
    }));

    console.log(`Analiz edilen aday sayısı: ${products.length}`);

    // Kategori ve Hacim bazlı grupla (Arama alanını daraltmak için)
    const groups = {};
    for (const p of products) {
        if (!p.core || p.core.length < 2 || p.volume === 'unknown') continue;
        const key = `${p.category}|${p.volume}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    }

    let matchCount = 0;

    for (const key in groups) {
        const group = groups[key];
        if (group.length < 2) continue;

        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const p1 = group[i];
                const p2 = group[j];

                if (p1.brand !== p2.brand) {
                    const sim = getSimilarity(p1.core, p2.core);

                    // Benzerlik skoru 0.65 üzerindeyse muadil say (daha agresif)
                    if (sim >= 0.65) {
                        db.run(`INSERT OR IGNORE INTO product_equivalents (original_product_id, equivalent_product_id, match_type) VALUES (?, ?, 'fuzzy')`, [p1.id, p2.id]);
                        db.run(`INSERT OR IGNORE INTO product_equivalents (original_product_id, equivalent_product_id, match_type) VALUES (?, ?, 'fuzzy')`, [p2.id, p1.id]);
                        matchCount++;
                    }
                }
            }
        }
    }

    saveDb();
    console.log(`\n✅ İşlem tamamlandı. ${matchCount} yeni muadil çifti bulundu.`);
}

match().catch(console.error);
