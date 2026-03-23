import { getDb } from './db.js';

async function check() {
    const db = await getDb();

    console.log('--- COCA COLA ENTRIES ---');
    const products = db.exec(`
        SELECT p.id, p.name, p.barcode, p.brand, pr.market_id, pr.price
        FROM products p
        LEFT JOIN prices pr ON p.id = pr.product_id
        WHERE (LOWER(p.name) LIKE '%coca%cola%' OR LOWER(p.name) LIKE '%cola%')
        AND p.image_url IS NOT NULL
        GROUP BY p.id, pr.market_id
        ORDER BY p.name ASC
        LIMIT 50
    `);

    if (products.length && products[0].values.length) {
        products[0].values.forEach(([id, name, barcode, brand, market, price]) => {
            console.log(`ID: ${id}, Barcode: ${barcode}, Market: ${market}, Price: ${price}, Name: ${name}`);
        });
    } else {
        console.log('No Cola products found.');
    }
}

check();
