import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'pipeline_stats.json');

export function logPipelineStats(stage, stats) {
    const timestamp = new Date().toISOString();
    const entry = {
        timestamp,
        stage,
        ...stats
    };

    console.log(`\n📊 [${stage}] STATS:`, JSON.stringify(stats, null, 2));

    try {
        let logs = [];
        if (fs.existsSync(LOG_FILE)) {
            logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
        logs.push(entry);
        // Keep only last 100 entries
        if (logs.length > 100) logs.shift();
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error('Failed to write to pipeline_stats.json', e.message);
    }
}

export function logError(stage, error) {
    const timestamp = new Date().toISOString();
    const entry = {
        timestamp,
        stage,
        status: 'error',
        error: error.message || error
    };

    console.error(`\n❌ [${stage}] ERROR:`, error);

    try {
        let logs = [];
        if (fs.existsSync(LOG_FILE)) {
            logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
        logs.push(entry);
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {
        // Fallback to console
    }
}
