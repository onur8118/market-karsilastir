import { getDb } from './server/db.js';

async function run() {
    const db = await getDb();
    const markets = ['a101', 'migros', 'carrefoursa', 'sok'];
    for (const m of markets) {
        console.log(`--- ${m} ---`);
        const result = db.exec(`SELECT id, name, source_url FROM products WHERE (barcode IS NULL OR barcode = '') AND source_url LIKE '%${m}%' AND name NOT LIKE '%kg%' AND (name LIKE '%nutella%' OR name LIKE '%ülker%' OR name LIKE '%eti%' OR name LIKE '%sütaş%') LIMIT 3`);
        if (result.length > 0) {
            result[0].values.forEach(([id, name, url]) => {
                console.log(`${id}|${name}|${url}`);
            });
        }
    }
    process.exit(0);
}

run().catch(console.error);
