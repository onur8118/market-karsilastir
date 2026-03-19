import { getDb } from './db.js';

async function investigate() {
    try {
        const db = await getDb();

        const totalProducts = db.exec('SELECT COUNT(*) FROM products')[0].values[0][0];
        const productsWithAnyPrice = db.exec('SELECT COUNT(DISTINCT product_id) FROM prices')[0].values[0][0];
        const productsWithLatestPrice = db.exec(`
            SELECT COUNT(DISTINCT p.id) 
            FROM products p 
            JOIN prices pr ON p.id = pr.product_id 
            WHERE pr.date = (SELECT MAX(date) FROM prices WHERE product_id = p.id)
        `)[0].values[0][0];

        const latestDateRes = db.exec('SELECT MAX(date) FROM prices');
        const latestDate = latestDateRes[0]?.values[0][0];

        const countLatestDate = db.exec('SELECT COUNT(DISTINCT product_id) FROM prices WHERE date = ?', [latestDate])[0].values[0][0];

        console.log(`Total Products: ${totalProducts}`);
        console.log(`Products with Any Price: ${productsWithAnyPrice}`);
        console.log(`Products with Price on Latest Date (${latestDate}): ${countLatestDate}`);
        console.log(`Products with a price that is their own latest: ${productsWithLatestPrice}`);

        const marketCounts = db.exec('SELECT market_id, COUNT(*) FROM prices GROUP BY market_id');
        console.log('\nTotal Price Records per Market:');
        marketCounts[0].values.forEach(row => console.log(`${row[0]}: ${row[1]}`));

    } catch (err) {
        console.error(err);
    }
}

investigate();
