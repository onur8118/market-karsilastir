import puppeteer from 'puppeteer';
import { upsertProduct, insertPrice, saveDb } from '../db.js';

function extractBrand(name) {
    const brands = [
        'Sütaş', 'Pınar', 'İçim', 'Mis', 'Ülker', 'Eti', 'Torku',
        'Coca-Cola', 'Pepsi', 'Fanta', 'Sprite', 'Nescafe',
        'Lipton', 'Doğadan', 'Erikli', 'Damla', 'Hayat',
        'Nutella', 'Barilla', 'Knorr',
        'Domestos', 'Fairy', 'Bingo', 'Persil', 'Ariel',
        'Head&Shoulders', 'Pantene', 'Dove', 'Rexona',
        'Colgate', 'Signal', 'Dalan',
        "Lay's", 'Doritos', 'Algida', 'Magnum',
        'Yudum', 'Komili', 'Reis', 'Duru',
    ];
    for (const brand of brands) {
        if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
    }
    return name.split(' ')[0];
}

import { guessCategory } from '../utils.js';

export async function scrapeCarrefoursa(db) {
    console.log('\n🔷 CarrefourSA scraping başlıyor...');

    let browser;
    let totalProducts = 0;
    let totalPrices = 0;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Optimizasyon: Gereksiz kaynakları engelle
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const categoryUrls = [
            'https://www.carrefoursa.com/meyve/c/1015',
            'https://www.carrefoursa.com/sebze/c/1025',
            'https://www.carrefoursa.com/kirmizi-et/c/1045',
            'https://www.carrefoursa.com/beyaz-et/c/1076',
            'https://www.carrefoursa.com/balik-ve-deniz-mahsulleri/c/1098',
            'https://www.carrefoursa.com/sut-sut-urunleri/c/1032',
            'https://www.carrefoursa.com/icecekler/c/1036',
            'https://www.carrefoursa.com/temel-gida/c/1034',
            'https://www.carrefoursa.com/atistirmaliklar/c/1080',
            'https://www.carrefoursa.com/temizlik-kagit/c/1038',
            'https://www.carrefoursa.com/kisisel-bakim/c/1040',
        ];

        for (const url of categoryUrls) {
            const parts = url.split('/').filter(Boolean);
            const catName = parts[parts.indexOf('c') - 1] || 'kategori';
            console.log(`  📂 Kategori: ${catName} (${url})`);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await sleep(5000); // Give extra time for JS to render cards
                await autoScroll(page);

                const products = await page.evaluate(() => {
                    const items = [];
                    const cards = document.querySelectorAll('li.product-item, [class*="product-card"], [class*="productCard"], .product-listing-item, [data-product-id]');

                    cards.forEach(card => {
                        const nameEl = card.querySelector('h3.name, [class*="product-name"], [class*="name"], .item-name, h3, h4');
                        const priceEls = card.querySelectorAll('.item-price, .price, [class*="price"], [class*="amount"]');
                        const imgEl = card.querySelector('img');
                        const linkEl = card.querySelector('a');

                        let priceText = '';
                        for (const el of priceEls) {
                            // Strip spaces to match prices like "12 , 90 TL" -> "12,90TL"
                            const cleanText = el.textContent.replace(/\s+/g, '');
                            if (cleanText.match(/\d+[.,]\d+/)) {
                                priceText = cleanText;
                                break;
                            }
                        }
                        const img = imgEl?.src || imgEl?.getAttribute('data-src') || '';
                        const href = linkEl?.href || '';

                        if (name && priceText) {
                            items.push({ name, priceText, img, href });
                        }
                    });
                    return items;
                });

                for (const p of products) {
                    console.log(`[DEBUG] Name: ${p.name} | Raw Price: '${p.priceText}'`);

                    // Try to match standard "12,90 TL" format or "12.90"
                    const priceMatch = p.priceText.match(/(\d{1,5}(?:[.,]\d{1,2})?)/);
                    if (!priceMatch) {
                        console.log(`[DEBUG] Regex failed!`);
                        continue;
                    }

                    const priceStr = priceMatch[1].replace(',', '.');
                    const price = parseFloat(priceStr);
                    if (!price || price <= 0) {
                        console.log(`[DEBUG] ParseFloat failed! priceStr=${priceStr}`);
                        continue;
                    }

                    const productId = upsertProduct(db, {
                        name: p.name,
                        brand: extractBrand(p.name),
                        category: guessCategory(p.name),
                        imageUrl: p.img,
                        sourceUrl: p.href,
                    });

                    insertPrice(db, {
                        productId,
                        marketId: 'carrefoursa',
                        price,
                    });

                    totalProducts++;
                    totalPrices++;
                }

                console.log(`    → ${products.length} ürün bulundu`);
            } catch (err) {
                console.warn(`    ❌ Kategori hatası: ${err.message}`);
            }

            saveDb(); // Save after each category
            await sleep(3000);
        }

    } catch (err) {
        console.error('❌ CarrefourSA genel hata:', err.message);
    } finally {
        if (browser) await browser.close();
    }

    saveDb();
    console.log(`  ✅ CarrefourSA tamamlandı: ${totalProducts} ürün, ${totalPrices} fiyat`);
    return { productsFound: totalProducts, pricesUpdated: totalPrices };
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight || totalHeight > 8000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Phase 2: Barcode search for CarrefourSA
export async function fetchPriceByBarcode(browser, barcode) {
    if (!barcode) return null;
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        const searchUrl = `https://www.carrefoursa.com/search/?text=${barcode}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        await sleep(2500);

        const result = await page.evaluate(() => {
            const card = document.querySelector('li.product-item') || document.querySelector('.product-card') || document.querySelector('.productCard');
            if (!card) return null;
            const priceEl = card.querySelector('.item-price, .price');
            const priceText = priceEl?.textContent?.replace(/\s+/g, '') || '';
            const inStock = !document.body.innerText.includes('Tükendi');
            return { priceText, inStock };
        });

        if (!result || !result.priceText) return null;

        const priceMatch = result.priceText.match(/(\d{1,5}(?:[.,]\d{1,2})?)/);
        if (!priceMatch) return null;

        const priceStr = priceMatch[1].replace(',', '.');
        const val = parseFloat(priceStr);
        return { price: isNaN(val) ? null : val, inStock: result.inStock };
    } catch (err) {
        console.warn(`[CarrefourSA] Barkod hatasi (${barcode}): ${err.message}`);
        return null;
    } finally {
        if (page) await page.close();
    }
}
