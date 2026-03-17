import { getDb } from './server/db.js';

async function check() {
    const db = await getDb();

    const productsWithPrices = db.exec('SELECT COUNT(DISTINCT product_id) FROM prices');
    console.log('Products with prices in total:', productsWithPrices[0].values[0][0]);

    const latestPrices = db.exec(`
        SELECT COUNT(*) FROM prices pr 
        WHERE pr.date = (
            SELECT MAX(pr2.date) FROM prices pr2 
            WHERE pr2.product_id = pr.product_id 
            AND pr2.market_id = pr.market_id
        )
    `);
    console.log('Total latest price entries:', latestPrices[0].values[0][0]);

    const distinctLatestProducts = db.exec(`
        SELECT COUNT(DISTINCT product_id) FROM prices pr 
        WHERE pr.date = (
            SELECT MAX(pr2.date) FROM prices pr2 
            WHERE pr2.product_id = pr.product_id 
            AND pr2.market_id = pr.market_id
        )
    `);
    console.log('Products with at least one latest price:', distinctLatestProducts[0].values[0][0]);

    const dates = db.exec('SELECT date, COUNT(*) FROM prices GROUP BY date ORDER BY date DESC LIMIT 10');
    console.log('Price counts by date:');
    dates[0].values.forEach(v => console.log(`  ${v[0]}: ${v[1]}`));
}

check().catch(console.error);
