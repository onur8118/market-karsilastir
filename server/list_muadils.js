import { getDb } from './db.js';

async function listMatches() {
    const db = await getDb(true);
    const r = db.exec(`
        SELECT p1.name, p1.brand, p2.name, p2.brand
        FROM product_equivalents e
        JOIN products p1 ON e.original_product_id = p1.id
        JOIN products p2 ON e.equivalent_product_id = p2.id
        WHERE e.original_product_id < e.equivalent_product_id
    `);

    if (r.length > 0 && r[0].values) {
        console.log('🔗 Muadil Matches Found:');
        for (const [n1, b1, n2, b2] of r[0].values) {
            console.log(`[${b1}] ${n1} <==> [${b2}] ${n2}`);
        }
    } else {
        console.log('No reciprocal matches found to list.');
    }
}

listMatches().catch(console.error);
