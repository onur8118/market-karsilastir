import dbModule from './db.js';
const { getDb, saveDb } = dbModule;

async function migrate() {
    console.log('🚀 Migrasyon başlıyor...');
    const db = await getDb();

    try {
        db.run('ALTER TABLE products ADD COLUMN nutrition_energy TEXT');
        console.log('✅ nutrition_energy eklendi');
    } catch (e) { }

    try {
        db.run('ALTER TABLE products ADD COLUMN nutrition_carbs TEXT');
        console.log('✅ nutrition_carbs eklendi');
    } catch (e) { }

    try {
        db.run('ALTER TABLE products ADD COLUMN nutrition_protein TEXT');
        console.log('✅ nutrition_protein eklendi');
    } catch (e) { }

    try {
        db.run('ALTER TABLE products ADD COLUMN nutrition_fat TEXT');
        console.log('✅ nutrition_fat eklendi');
    } catch (e) { }

    try {
        db.run('ALTER TABLE products ADD COLUMN ingredients TEXT');
        console.log('✅ ingredients eklendi');
    } catch (e) { }

    saveDb();
    console.log('🎉 Migrasyon tamamlandı!');
}

migrate();
