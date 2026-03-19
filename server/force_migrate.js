import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'fiyatradar.db');

async function forceMigrate() {
    console.log('🏗️  Zorunlu Migrasyon Başlıyor...');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    const cols = ['nutrition_energy', 'nutrition_carbs', 'nutrition_protein', 'nutrition_fat', 'ingredients'];

    for (const col of cols) {
        try {
            db.run(`ALTER TABLE products ADD COLUMN ${col} TEXT`);
            console.log(`✅ ${col} eklendi.`);
        } catch (e) {
            console.log(`ℹ️  ${col} zaten var veya hata: ${e.message}`);
        }
    }

    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('💾 Veritabanı dosyasına yazıldı.');

    // Verification
    const res = db.exec('PRAGMA table_info(products)');
    console.log('📊 Güncel Şema:', JSON.stringify(res[0].values.slice(-6), null, 2));
}

forceMigrate().catch(console.error);
