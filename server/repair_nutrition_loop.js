import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let iteration = 0;
let MAX_ITERATIONS = 500; // Limit just in case it runs infinitely

console.log('🔄 Besin Değerleri Toplu Onarım Döngüsü Başlıyor...');
console.log('Bu işlem bitene kadar "repair_nutrition.js" betiği art arda çalıştırılacak.');

while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n--- [DÖNGÜ ${iteration}] ---`);
    try {
        const output = execSync('node repair_nutrition.js', { encoding: 'utf-8', cwd: __dirname });
        console.log(output);

        if (output.includes('Onarılacak ürün kalmadı') || output.includes('kalmadı')) {
            console.log('✅ Bütün eksik besin değerleri işlemleri tamamlandı. Döngüden çıkılıyor.');
            break;
        }
    } catch (err) {
        console.error('❌ Betik çalıştırılırken hata oluştu:', err.message);
        console.log('5 saniye sonra tekrar deneniyor...');
        execSync('node -e "setTimeout(() => {}, 5000)"');
    }
}
