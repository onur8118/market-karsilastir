import { getDb, saveDb } from './db.js';

async function syncMarkets() {
    const db = await getDb();
    const markets = [
        ['a101', 'A101', '#0057A8', '#E8F1FA', 'https://www.a101.com.tr'],
        ['sok', 'ŞOK', '#FFD100', '#FFF9E0', 'https://www.sokmarket.com.tr'],
        ['migros', 'Migros', '#F26F21', '#FEF0E6', 'https://www.migros.com.tr'],
        ['carrefoursa', 'CarrefourSA', '#004E9A', '#E6EEF6', 'https://www.carrefoursa.com'],
        ['happycenter', 'Happy Center', '#009639', '#e6f4eb', 'https://www.happy.com.tr'],
        ['bizim', 'Bizim Toptan', '#004a99', '#e6edf5', 'https://www.bizimtoptan.com.tr'],
        ['file', 'File Market', '#009b4c', '#e6f5ed', 'https://www.file.com.tr'],
        ['metro', 'Metro', '#00366b', '#e6ebf0', 'https://www.metro-tr.com'],
        ['mopas', 'Mopaş', '#E30613', '#FCE8EA', 'https://mopas.com.tr']
    ];

    console.log('🔄 Market tablosu güncelleniyor...');
    for (const [id, name, color, bgColor, baseUrl] of markets) {
        db.run(`
            INSERT OR IGNORE INTO markets (id, name, color, bg_color, base_url)
            VALUES (?, ?, ?, ?, ?)
        `, [id, name, color, bgColor, baseUrl]);

        // Also update existing name if it was null or different
        db.run(`
            UPDATE markets SET name = ?, color = ?, bg_color = ?, base_url = ?
            WHERE id = ?
        `, [name, color, bgColor, baseUrl, id]);
    }

    await saveDb();
    console.log('✅ Marketler başarıyla senkronize edildi.');
}

syncMarkets().catch(console.error);
