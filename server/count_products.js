import { getDb } from './db.js';

(async () => {
    const db = await getDb(true);
    const result = db.exec('SELECT COUNT(*) AS cnt FROM products');
    if (result.length && result[0].values.length) {
        console.log('Total products:', result[0].values[0][0]);
    } else {
        console.log('No products found');
    }
})().catch(console.error);
