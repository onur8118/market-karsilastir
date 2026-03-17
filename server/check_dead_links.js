import { getDb, saveDb } from './db.js';

async function checkDeadLinks(limit = 100) {
    console.log(`🔗 Starting Dead Link Check (Limit: ${limit})...`);
    const db = await getDb();

    const productsResult = db.exec(`SELECT id, name, source_url FROM products WHERE source_url IS NOT NULL ORDER BY updated_at ASC LIMIT ${limit}`);

    if (!productsResult.length || !productsResult[0].values) {
        console.log('No products with source URLs found.');
        return;
    }

    const products = productsResult[0].values.map(r => ({ id: r[0], name: r[1], url: r[2] }));
    console.log(`Checking ${products.length} product links...`);

    let deadCount = 0;
    const CONCURRENCY = 10;

    for (let i = 0; i < products.length; i += CONCURRENCY) {
        const chunk = products.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map(async (p) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(p.url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                clearTimeout(timeout);
                return { id: p.id, ok: res.ok, status: res.status };
            } catch (e) {
                return { id: p.id, ok: false, error: e.message };
            }
        }));

        for (const res of results) {
            if (!res.ok) {
                deadCount++;
                console.log(`❌ Dead Link [ID: ${res.id}]: Status ${res.status || res.error}`);
                // Optional: Flag in DB
                // db.run('UPDATE products SET source_url = NULL WHERE id = ?', [res.id]);
            }
        }
        process.stdout.write(`\rProgress: ${i + chunk.length}/${products.length}`);
    }

    console.log(`\n\n✅ Done. Found ${deadCount} dead links.`);
}

const args = process.argv.slice(2);
const limit = parseInt(args[0], 10) || 100;
checkDeadLinks(limit).catch(console.error);
