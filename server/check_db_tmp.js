import { getDb } from './db.js';

async function main() {
    const db = await getDb();
    const prodCount = db.exec('SELECT COUNT(*) FROM products')[0]?.values[0][0] || 0;
    const priceCount = db.exec('SELECT COUNT(*) FROM prices WHERE date = date(\'now\')')[0]?.values[0][0] || 0;
    console.log('Products:', prodCount);
    console.log('Prices Today:', priceCount);
    process.exit(0);
}

main().catch(console.error);
