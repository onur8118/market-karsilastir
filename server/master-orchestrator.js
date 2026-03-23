/**
 * MASTER ORCHESTRATOR — FiyatRadar
 * Automates the entire data pipeline in a continuous loop.
 * 1. Scraping (New prices)
 * 2. Categories (Cleanup)
 * 3. Deduplication (Data quality)
 * 4. Matching (Muadiller)
 * 5. Barcodes (Enrichment)
 * 6. Maintenance (Dead links)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const WAIT_HOURS = 6;
const BARCODE_BATCH_SIZE = 500;
const LOG_FILE = 'orchestrator.log';

function log(msg) {
    const timestamp = new Date().toLocaleString('tr-TR');
    const line = `[${timestamp}] ${msg}\n`;
    console.log(line.trim());
    fs.appendFileSync(LOG_FILE, line);
}

function runStage(name, cmd) {
    log(`🚀 STARTING STAGE: ${name}`);
    const start = Date.now();
    try {
        // Use stdio: inherit to see output in terminal, but wrap in try/catch to not crash the orchestrator
        execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        log(`✅ STAGE COMPLETE: ${name} (${duration}s)`);
        return true;
    } catch (e) {
        log(`❌ STAGE FAILED: ${name}`);
        log(`Error: ${e.message}`);
        return false;
    }
}

async function main() {
    log('================================================');
    log('📡 FIYATRADAR MASTER ORCHESTRATOR STARTED');
    log('================================================');

    while (true) {
        log('\n--- NEW CYCLE STARTING ---');

        // Stage 1: Market Scraping
        runStage('Market Scrapers', 'node run-all-markets.js');

        // Stage 1.5: Live Price Updater (Phase 2 Barcode Lookups)
        runStage('Live Price Updater', 'node update_prices_by_barcode.js');

        // Stage 2: Category Cleanup
        runStage('Category Cleanup', 'node cleanup_categories.js');

        // Stage 3: Deduplication
        runStage('Deduplication', 'node dedup-db.js');

        // Stage 4: Muadil Matching
        runStage('Muadil Matcher', 'node muadil_matcher.js');

        // Stage 5: Barcode Enrichment (Turbo Mode)
        runStage('Barcode Enrichment', `node turbo-enrich.js`);

        // Stage 6: Dead Link Check
        runStage('Link Maintenance', 'node check_dead_links.js');

        log('\n--- CYCLE COMPLETE ---');
        log(`Next run in ${WAIT_HOURS} hours.`);

        // Wait
        await new Promise(resolve => setTimeout(resolve, WAIT_HOURS * 60 * 60 * 1000));
    }
}

// Ensure log file starts fresh if it gets too big (optional)
if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 5 * 1024 * 1024) {
    fs.renameSync(LOG_FILE, LOG_FILE + '.old');
}

main().catch(e => {
    log(`CRITICAL SYSTEM ERROR: ${e.message}`);
});
