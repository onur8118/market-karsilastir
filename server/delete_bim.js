import { getDb, saveDb } from './db.js';

async function removeBim() {
    const db = await getDb();
    console.log('🔄 Bim siliniyor...');
    db.exec("DELETE FROM markets WHERE id='bim'");
    await saveDb();
    console.log('✅ Bim başarıyla silindi.');
}

removeBim().catch(console.error);
