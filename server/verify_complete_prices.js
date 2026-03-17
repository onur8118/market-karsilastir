import { getDb } from './db.js';

async function verifyCompletePrices() {
    const db = await getDb();

    // Main markets we care about
    const markets = ['a101', 'bim', 'sok', 'migros', 'carrefoursa'];

    const totalProductsResult = db.exec("SELECT COUNT(*) FROM products");
    const totalProducts = totalProductsResult[0].values[0][0];

    console.log('\n📊 FİYAT TAMAMLIK RAPORU');
    console.log('========================');
    console.log(`Toplam Ürün: ${totalProducts}`);

    // Count products per market
    for (const marketId of markets) {
        const countResult = db.exec(`
            SELECT COUNT(DISTINCT product_id) 
            FROM prices 
            WHERE market_id = ?
        `, [marketId]);
        const count = countResult[0].values[0][0];
        console.log(`${marketId.toUpperCase()}: ${count} ürün (%${((count / totalProducts) * 100).toFixed(1)})`);
    }

    // Find products missing in specific markets
    const missingAnyResult = db.exec(`
        SELECT p.id, p.name, p.brand
        FROM products p
        LEFT JOIN prices pr ON p.id = pr.product_id
        GROUP BY p.id
        HAVING COUNT(DISTINCT pr.market_id) < ?
    `, [markets.length]);

    const incomplete = missingAnyResult.length > 0 ? missingAnyResult[0].values.length : 0;
    console.log(`\nEksik Fiyatı Olan Ürün Sayısı: ${incomplete} (%${((incomplete / totalProducts) * 100).toFixed(1)})`);

    if (incomplete > 0) {
        console.log('\n🔍 Eksik Fiyatlı Örnek Ürünler (İlk 10):');
        missingAnyResult[0].values.slice(0, 10).forEach(([id, name, brand]) => {
            const foundInResult = db.exec("SELECT market_id FROM prices WHERE product_id = ?", [id]);
            const foundIn = foundInResult.length > 0 ? foundInResult[0].values.map(v => v[0]).join(', ') : 'Hiçbir market';
            console.log(`[ID: ${id}] ${brand} ${name} (Bulunduğu Marketler: ${foundIn})`);
        });
    }
}

verifyCompletePrices().catch(console.error);
