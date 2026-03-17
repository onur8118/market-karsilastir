import { getDb, saveDb } from './db.js';
import { guessCategory } from './utils.js';

async function cleanup() {
    console.log('🧹 Miscategorization cleanup starting...');
    const db = await getDb(true);

    const productsResult = db.exec("SELECT id, name, category, source_url FROM products");
    if (!productsResult.length || !productsResult[0].values) {
        console.log('No products found.');
        return;
    }

    const products = productsResult[0].values.map(r => ({ id: r[0], name: r[1], category: r[2], source_url: r[3] }));
    console.log(`Analyzing ${products.length} products...`);

    let updatedCount = 0;

    for (const product of products) {
        const newCategory = guessCategory(product.source_url, product.name);

        if (newCategory !== product.category) {
            db.run("UPDATE products SET category = ? WHERE id = ?", [newCategory, product.id]);
            updatedCount++;
            if (updatedCount % 50 === 0) {
                console.log(`[${updatedCount}] Updated: ${product.name} -> ${newCategory}`);
            }
        }
    }

    saveDb();
    console.log(`\n🎉 Cleanup finished. Updated ${updatedCount} products.`);
}

cleanup().catch(console.error);
