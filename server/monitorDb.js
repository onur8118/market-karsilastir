import { getDb } from './db.js';

async function monitor() {
    console.log("Starting Live Database Monitor...");

    setInterval(async () => {
        const db = await getDb();
        const totalProducts = db.exec('SELECT COUNT(*) FROM products')[0].values[0][0];

        const markets = db.exec(`
            SELECT market_id, COUNT(DISTINCT product_id) as c
            FROM prices 
            WHERE date = date('now') 
            GROUP BY market_id
            ORDER BY c DESC
        `);

        console.clear();
        console.log(`--- Live Db Monitor ---`);
        console.log(`Total Products in DB: ${totalProducts}\n`);
        console.log(`Today's Price Updates by Market:`);

        if (markets.length > 0) {
            markets[0].values.forEach(row => {
                console.log(`- ${row[0]}: ${row[1]}`);
            });
        }
    }, 5000);
}

monitor().catch(console.error);
