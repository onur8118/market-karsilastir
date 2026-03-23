import { execSync } from 'child_process';

try {
    const listCmd = process.platform === 'win32' ? 'wmic process where "name=\\'node.exe\\'" get ProcessId,CommandLine /format:list' : 'ps aux | grep node';
    const output = execSync(listCmd, { encoding: 'utf8' });

    const lines = output.split('\\n');
    let currentCmd = '';

    for (const line of lines) {
        if (line.trim().startsWith('CommandLine=')) {
            currentCmd = line.substring(12);
        } else if (line.trim().startsWith('ProcessId=')) {
            const pid = parseInt(line.substring(10), 10);
            if (currentCmd.includes('marketkarsilastir.js') && !currentCmd.includes('kill_scraper.js')) {
                console.log(`Killing scraper PID: ${pid}`);
                process.kill(pid);
            }
        }
    }
    console.log('Scraper killed if it was running.');
} catch (err) {
    console.error('Error finding/killing process:', err.message);
}
