import { getDb } from './db.js';

async function checkStatus() {
    const db = await getDb(true); // forceReload

    // Total products
    const totalResult = db.exec("SELECT COUNT(*) FROM products");
    const total = totalResult.length ? totalResult[0].values[0][0] : 0;

    // Products with barcode
    const barcodeResult = db.exec("SELECT COUNT(*) FROM products WHERE barcode IS NOT NULL AND barcode != '' AND length(barcode) >= 8");
    const barcode = barcodeResult.length ? barcodeResult[0].values[0][0] : 0;

    // Products with description
    const descResult = db.exec("SELECT COUNT(*) FROM products WHERE description IS NOT NULL AND description != ''");
    const doc = descResult.length ? descResult[0].values[0][0] : 0;

    console.log(`\n============== ÜRÜN YÜKLEME DURUMU ==============`);
    console.log(`Toplam Kayıtlı Ürün: ${total}`);
    console.log(`Barkodu Başarıyla Çekilmiş: ${barcode}`);
    console.log(`Açıklaması / İçindekiler Çekilmiş: ${doc}`);
    console.log(`=================================================`);
}

checkStatus().catch(console.error);
