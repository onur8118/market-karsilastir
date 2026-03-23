import { getDb, saveDb } from './db.js';

async function removeExtras() {
    const db = await getDb();
    console.log('🔄 Tarım Kredi ve Onur Market siliniyor...');
    db.exec("DELETE FROM markets WHERE id IN ('tarimkredi', 'onur')");
    await saveDb();
    console.log('✅ Ekstra marketler başarıyla silindi.');
}

removeExtras().catch(console.error);
