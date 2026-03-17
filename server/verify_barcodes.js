import { getDb } from './db.js';

async function verifyBarcodes() {
    const db = await getDb();

    const totalProductsResult = db.exec("SELECT COUNT(*) FROM products");
    const totalProducts = totalProductsResult[0].values[0][0];

    const withBarcodeResult = db.exec("SELECT COUNT(*) FROM products WHERE barcode IS NOT NULL AND barcode != ''");
    const withBarcode = withBarcodeResult[0].values[0][0];

    const withoutBarcodeResult = db.exec("SELECT id, name, brand FROM products WHERE barcode IS NULL OR barcode = '' LIMIT 20");
    const missing = withoutBarcodeResult.length > 0 ? withoutBarcodeResult[0].values : [];

    console.log('\n📊 BARKOD DOĞRULAMA RAPORU');
    console.log('==========================');
    console.log(`Toplam Ürün: ${totalProducts}`);
    console.log(`Barkodlu Ürün: ${withBarcode} (%${((withBarcode / totalProducts) * 100).toFixed(1)})`);
    console.log(`Barkodsuz Ürün: ${totalProducts - withBarcode}`);

    if (missing.length > 0) {
        console.log('\n🔍 Barkodu Eksik Örnek Ürünler:');
        missing.forEach(([id, name, brand]) => {
            console.log(`[ID: ${id}] ${brand} ${name}`);
        });
    }
}

verifyBarcodes().catch(console.error);
