import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'fiyatradar.db');

async function count() {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    const query = `
        SELECT count(DISTINCT p.id)
        FROM products p
        JOIN prices pr ON p.id = pr.product_id
        WHERE (pr.market_id = 'migros' OR pr.market_id = 'sok')
          AND p.nutrition_carbs IS NULL
          AND p.source_url IS NOT NULL
    `;
    const result = db.exec(query);
    console.log("Missing Nutrition Count:", result[0].values[0][0]);
}

count().catch(console.error);
