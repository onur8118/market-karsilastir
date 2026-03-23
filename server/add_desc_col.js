import { getDb, saveDb } from './db.js';

async function migrate() {
    const db = await getDb(true);
    console.log('🔄 Veritabanı kontrol ediliyor...');
    try {
        db.exec("ALTER TABLE products ADD COLUMN description TEXT;");
        await saveDb();
        console.log('✅ description sütunu başarıyla eklendi.');
    } catch (e) {
        console.log('⚠️ Sütun zaten var veya hata: ', e.message);
    }
}

migrate().catch(console.error);
