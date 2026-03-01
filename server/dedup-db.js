import { getDb, normalizeName, getBaseMatchStr } from './db.js';

async function mergeExistingProducts() {
    const db = await getDb();
    console.log("Analyzing existing products for deduplication...");

    const allProductsResult = db.exec("SELECT id, name, barcode FROM products");
    if (!allProductsResult.length || !allProductsResult[0].values.length) return;

    const allProducts = allProductsResult[0].values.map(r => ({
        id: r[0],
        name: r[1],
        barcode: r[2],
        matchStr: getBaseMatchStr(normalizeName(r[1]))
    }));

    let mergeCount = 0;
    const processedIds = new Set();

    // Group products by matchStr
    const groups = {};
    for (const p of allProducts) {
        if (!groups[p.matchStr]) groups[p.matchStr] = [];
        groups[p.matchStr].push(p);
    }

    // Advanced fuzzy grouping
    for (let i = 0; i < allProducts.length; i++) {
        const p1 = allProducts[i];
        if (processedIds.has(p1.id)) continue;

        const group = [p1];
        processedIds.add(p1.id);

        for (let j = i + 1; j < allProducts.length; j++) {
            const p2 = allProducts[j];
            if (processedIds.has(p2.id)) continue;

            const isBarcodeMatch = p1.barcode && p2.barcode && p1.barcode === p2.barcode;
            const isMatchStrMatch = p1.matchStr === p2.matchStr;
            const isSubstringMatch = p1.matchStr.length > 15 && p2.matchStr.length > 15 &&
                (p1.matchStr.startsWith(p2.matchStr) || p2.matchStr.startsWith(p1.matchStr));

            if (isBarcodeMatch || isMatchStrMatch || isSubstringMatch) {
                group.push(p2);
                processedIds.add(p2.id);
            }
        }

        if (group.length > 1) {
            // Merge group into the first ID
            const targetId = group[0].id;
            const oldIds = group.slice(1).map(p => p.id);

            console.log(`Merging ${oldIds.length} duplicate(s) into ID ${targetId} (${group[0].name})`);

            for (const oldId of oldIds) {
                // Transfer prices
                try {
                    db.run('UPDATE prices SET product_id = ? WHERE product_id = ?', [targetId, oldId]);
                } catch (e) { /* ignore constraint errors if already exists for same date */ }

                // Delete old duplicate product
                db.run('DELETE FROM products WHERE id = ?', [oldId]);
                mergeCount++;
            }
        }
    }

    // Additional cleanup (remove orphaned prices)
    db.run('DELETE FROM prices WHERE product_id NOT IN (SELECT id FROM products)');

    // Delete duplicate prices for same market & product & date
    db.run(`
        DELETE FROM prices WHERE id NOT IN (
            SELECT MIN(id) FROM prices GROUP BY product_id, market_id, date
        )
    `);

    // Let's test the Kola example right now
    const colas = db.exec("SELECT id, name FROM products WHERE LOWER(name) LIKE '%cola%' OR LOWER(name) LIKE '%kola%'");
    console.log(`\nRemaining Cola variants in DB after merge: ${colas[0]?.values.length || 0}`);
    if (colas[0]?.values) {
        colas[0].values.forEach(v => console.log(`  [${v[0]}] ${v[1]}`));
    }

    console.log(`\nSuccessfully merged ${mergeCount} duplicate products.`);

    // Explicitly write db back to disk
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const DB_PATH = path.join(__dirname, 'fiyatradar.db');
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

mergeExistingProducts().catch(console.error);
