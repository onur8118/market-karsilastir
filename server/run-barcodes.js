/**
 * run-barcodes.js
 * Runs fetch_missing_barcodes in batches of 200 with auto-restart on crash.
 * Keeps going until all barcodes are fetched.
 */
import { exec } from 'child_process';
import { getDb } from './db.js';

async function countMissing() {
    const db = await getDb();
    const r = db.exec("SELECT COUNT(*) FROM products WHERE (barcode IS NULL OR barcode = '') AND category != 'meyve-sebze'");
    return r[0]?.values[0]?.[0] || 0;
}

function runBatch(limit, offset) {
    return new Promise((resolve) => {
        const cmd = `node fetch_missing_barcodes.js --limit ${limit}`;
        console.log(`\n▶ Running batch (limit=${limit})...`);
        const child = exec(cmd, { cwd: process.cwd() });

        child.stdout.on('data', d => process.stdout.write(d));
        child.stderr.on('data', d => process.stderr.write(d));

        child.on('close', (code) => {
            console.log(`\n⬛ Batch done. Exit: ${code}`);
            resolve(code);
        });
    });
}

async function main() {
    let round = 0;
    while (true) {
        round++;
        const missing = await countMissing();
        if (missing === 0) {
            console.log('🎉 ALL BARCODES FETCHED!');
            break;
        }
        console.log(`\n🔄 Round ${round}: ${missing} products still missing barcodes.`);
        await runBatch(300);
        await new Promise(r => setTimeout(r, 5000)); // 5s cooldown
    }
}

main().catch(console.error);
