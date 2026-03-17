import { getDb } from './db.js';
import { guessCategory } from './utils.js';

const PRIVATE_LABEL_BRANDS = [
    'Birşah', 'Mis', 'Dost', 'Piyale', 'Mintax', 'Amigo', 'Evin', 'Lio', 'Deren'
];

async function diagnose() {
    const db = await getDb(true);

    console.log('--- 1. Verification ---');
    const verifyItems = ['Sütlü Nuriye', 'Tavuk Bulyon', 'Limon Kolonyası', 'Eti Cin'];
    for (const item of verifyItems) {
        const r = db.exec("SELECT name, category FROM products WHERE name LIKE ?", [`%${item}%`]);
        if (r.length > 0 && r[0].values.length > 0) {
            console.log(`Found: ${r[0].values[0][0]} | Category: ${r[0].values[0][1]}`);
        } else {
            console.log(`Not found: ${item}`);
        }
    }

    console.log('\n--- 2. Brand Analysis ---');
    const brandsResult = db.exec("SELECT DISTINCT brand FROM products WHERE brand IN ('Birşah', 'Mis', 'Birşah ', ' Mis', 'BİRŞAH', 'MİS')");
    if (brandsResult.length > 0) {
        console.log('Brands found in DB:', brandsResult[0].values.flat());
    } else {
        console.log('No specific PL brands found with those names.');
    }

    console.log('\n--- 3. Potential Match Analysis ---');
    const samples = db.exec("SELECT name, brand, category FROM products WHERE name LIKE '%Süt 1 L%' LIMIT 10");
    if (samples.length > 0) {
        console.log('Sample "Süt 1 L" products:');
        console.log(samples[0].values);
    }
}

diagnose().catch(console.error);
