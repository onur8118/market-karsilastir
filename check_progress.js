import { getDb } from './server/db.js';

async function check() {
    try {
        const db = await getDb(true); // forceReload

        const countRes = db.exec("SELECT COUNT(*) FROM products WHERE barcode IS NOT NULL AND barcode != ''");
        const found = countRes[0].values[0][0];

        const missingRes = db.exec("SELECT COUNT(*) FROM products WHERE barcode IS NULL OR barcode = ''");
        const missing = missingRes[0].values[0][0];

        console.log(`PROGRESS: FOUND=${found}, MISSING=${missing}, TOTAL=${found + missing}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
