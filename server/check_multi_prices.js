import { getDb } from './db.js';

async function check() {
    const db = await getDb();

    console.log('--- PRODUCTS WITH MULTIPLE PRICES ---');
    const multiPrices = db.exec(`
        SELECT p.id, p.name, COUNT(DISTINCT pr.market_id) as market_count
        FROM products p
        JOIN prices pr ON p.id = pr.product_id
        GROUP BY p.id
        HAVING market_count > 1
        ORDER BY market_count DESC
        LIMIT 20
    `);

    if (multiPrices.length && multiPrices[0].values.length) {
        for (const [id, name, count] of multiPrices[0].values) {
            console.log(`ID: ${id}, Name: ${name}, Market Count: ${count}`);
            const prices = db.exec(`
                SELECT m.name, pr.price, pr.date
                FROM prices pr
                JOIN markets m ON pr.market_id = m.id
                WHERE pr.product_id = ?
                GROUP BY pr.market_id
                ORDER BY pr.date DESC
            `, [id]);
            if (prices.length) {
                prices[0].values.forEach(([market, price, date]) => {
                    console.log(`  - Market: ${market}, Price: ${price}, Date: ${date}`);
                });
            }
        }
    } else {
        console.log('No products found with multiple market prices.');
    }

    console.log('\n--- TOTAL PRODUCTS ---');
    const total = db.exec('SELECT COUNT(*) FROM products');
    console.log(`Total Products: ${total[0].values[0][0]}`);

    const totalPrices = db.exec('SELECT COUNT(*) FROM prices');
    console.log(`Total Prices: ${totalPrices[0].values[0][0]}`);
}

check();
