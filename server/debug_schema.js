import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'fiyatradar.db');

async function debugSchema() {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);
    const result = db.exec('PRAGMA table_info(products)');
    console.log(JSON.stringify(result[0].values, null, 2));
}

debugSchema();
