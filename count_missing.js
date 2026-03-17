import { getDb } from './server/db.js';

async function count() {
    const db = await getDb();
    const result = db.exec("SELECT COUNT(*) FROM products WHERE barcode IS NULL OR barcode = ''");
    console.log("Missing barcodes:", result[0].values[0][0]);
}

count().catch(console.error);
