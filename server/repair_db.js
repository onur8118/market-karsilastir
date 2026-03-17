
import { getDb, saveDb } from './db.js';

async function repairDb() {
    console.log('🛠️ Veritabanı onarımı başlatılıyor...');
    const db = await getDb();

    // 1. Find invalid products starting with % or containing it as the only content
    const invalidProducts = db.exec("SELECT id, name FROM products WHERE name LIKE '%%%' ESCAPE '\\' OR name GLOB '[%]*'");

    if (invalidProducts.length > 0 && invalidProducts[0].values.length > 0) {
        console.log(`⚠️ ${invalidProducts[0].values.length} adet hatalı ürün tespit edildi.`);

        for (const [id, name] of invalidProducts[0].values) {
            // These products are likely duplicates of existing good ones or just bad data.
            // If we have a source_url, we might be able to recover or we can just delete if they have no prices.
            console.log(`   - Siliniyor: [ID: ${id}] ${name}`);

            // Delete prices associated with this invalid product
            db.run("DELETE FROM prices WHERE product_id = ?", [id]);
            // Delete the invalid product
            db.run("DELETE FROM products WHERE id = ?", [id]);
        }
    } else {
        console.log('✅ Hatalı isimli ürün bulunamadı.');
    }

    // 2. Clear other corrupted name patterns if any (e.g., just numbers or very short strings)
    // For now, only '%' is the known issue.

    saveDb();
    console.log('✨ Onarım tamamlandı.');
}

repairDb().catch(console.error);
