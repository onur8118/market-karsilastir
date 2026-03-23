/**
 * turbo-enrich.js
 * Aggressive barcode enrichment using concurrent batches.
 * Designed to clear the 16k backlog efficiently.
 */
import { exec } from 'child_process';
import { getDb } from './db.js';

const CONCURRENCY = 3; // Number of parallel batches
const BATCH_SIZE = 200;
const WAIT_BETWEEN_BATCHES = 2000; // 2 seconds cooldown

async function countMissing() {
    const db = await getDb();
    const r = db.exec("SELECT COUNT(*) FROM products WHERE (barcode IS NULL OR barcode = '') AND category != 'meyve-sebze'");
    return r[0]?.values[0]?.[0] || 0;
}

function runBatch(id) {
    return new Promise((resolve) => {
        const cmd = `node fetch_missing_barcodes.js --limit ${BATCH_SIZE}`;
        console.log(`[Worker ${id}] Starting batch...`);
        const child = exec(cmd, { cwd: process.cwd() });

        child.stdout.on('data', d => process.stdout.write(`[Worker ${id}] ${d}`));
        child.stderr.on('data', d => process.stderr.write(`[Worker ${id}] ERROR: ${d}`));
        child.on('close', (code) => {
            console.log(`[Worker ${id}] Finished with code ${code}`);
            resolve(code);
        });
    });
}

async function main() {
    console.log('🚀 TURBO ENRICHMENT STARTED');

    while (true) {
        const missing = await countMissing();
        if (missing === 0) {
            console.log('🎉 MISSION ACCOMPLISHED: All barcodes fetched!');
            break;
        }

        console.log(`\n📊 Status: ${missing} products remaining.`);

        const workers = [];
        for (let i = 0; i < CONCURRENCY; i++) {
            workers.push(runBatch(i));
        }

        await Promise.all(workers);
        console.log(`\n💤 Cooldown for ${WAIT_BETWEEN_BATCHES}ms...`);
        await new Promise(r => setTimeout(r, WAIT_BETWEEN_BATCHES));
    }
}

main().catch(console.error);
