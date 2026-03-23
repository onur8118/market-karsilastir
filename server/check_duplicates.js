import { getDb } from './db.js';

async function check() {
    const db = await getDb();

    console.log('--- DUPLICATE BARCODES ---');
    const dupBarcodes = db.exec(`
        SELECT barcode, COUNT(*) as c 
        FROM products 
        WHERE barcode IS NOT NULL AND barcode != '' 
        GROUP BY barcode 
        HAVING c > 1 
        ORDER BY c DESC 
        LIMIT 20
    `);

    if (dupBarcodes.length && dupBarcodes[0].values.length) {
        for (const [barcode, count] of dupBarcodes[0].values) {
            console.log(`Barcode: ${barcode}, Count: ${count}`);
            const products = db.exec(`SELECT id, name, market_id FROM products WHERE barcode = ?`, [barcode]);
            // Wait, market_id is NOT in products table... it's in prices.
            const pInfo = db.exec(`
                SELECT p.id, p.name, pr.market_id 
                FROM products p
                LEFT JOIN prices pr ON p.id = pr.product_id
                WHERE p.barcode = ?
                GROUP BY p.id
            `, [barcode]);
            if (pInfo.length) {
                pInfo[0].values.forEach(([id, name, market]) => {
                    console.log(`  - ID: ${id}, Market: ${market}, Name: ${name}`);
                });
            }
        }
    } else {
        console.log('No duplicate barcodes found.');
    }

    console.log('\n--- DUPLICATE NAMES ---');
    const dupNames = db.exec(`
        SELECT name, brand, COUNT(*) as c 
        FROM products 
        GROUP BY name, brand 
        HAVING c > 1 
        ORDER BY c DESC 
        LIMIT 20
    `);

    if (dupNames.length && dupNames[0].values.length) {
        for (const [name, brand, count] of dupNames[0].values) {
            console.log(`Name: ${name}, Brand: ${brand}, Count: ${count}`);
        }
    } else {
        console.log('No duplicate names found.');
    }
}

check();
