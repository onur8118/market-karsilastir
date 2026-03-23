import { getDb, saveDb } from './db.js';

async function removeHC() {
    const db = await getDb(true);

    db.run("DELETE FROM prices WHERE market_id = 'happycenter'");
    console.log("Deleted all prices associated with Happy Center.");

    db.run("DELETE FROM markets WHERE id = 'happycenter'");
    console.log("Deleted Happy Center from markets table.");

    // Delete orphaned products (products that only had prices in happycenter and nowhere else)
    db.run("DELETE FROM products WHERE id NOT IN (SELECT DISTINCT product_id FROM prices)");
    console.log("Deleted orphaned products with zero prices left.");

    saveDb();
    console.log("Database successfully cleaned and saved.");
}

removeHC().catch(console.error);
