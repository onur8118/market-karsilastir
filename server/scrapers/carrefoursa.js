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

function guessCategory(name) {
    const n = name.toLowerCase();
    if (/süt|yoğurt|peynir|ayran|tereyağ|krema|kaşar/.test(n)) return 'sut-urunleri';
    if (/su |cola|fanta|sprite|meyve suyu|çay|kahve|nescafe|lipton|soda/.test(n)) return 'icecek';
    if (/çikolata|gofret|bisküvi|cips|kraker|nutella|doritos/.test(n)) return 'atistirmalik';
    if (/deterjan|çamaşır|bulaşık|domestos|fairy|temiz/.test(n)) return 'temizlik';
    if (/şampuan|sabun|diş|deodorant|krem|bakım/.test(n)) return 'kisisel-bakim';
    if (/makarna|pirinç|un |yağ|tuz|şeker|salça|konserve|çorba/.test(n)) return 'temel-gida';
    if (/dondurma/.test(n)) return 'dondurulmus';
    return 'temel-gida';
}

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

        const categoryUrls = [
            'https://www.carrefoursa.com/sut-sut-urunleri/c/1032',
            'https://www.carrefoursa.com/icecekler/c/1036',
            'https://www.carrefoursa.com/temel-gida/c/1034',
            'https://www.carrefoursa.com/atistirmaliklar/c/1080',
            'https://www.carrefoursa.com/temizlik-kagit/c/1038',
            'https://www.carrefoursa.com/kisisel-bakim/c/1040',
        ];

        for (const url of categoryUrls) {
            const catName = url.split('/').filter(Boolean).slice(-2, -1)[0];
            console.log(`  📂 Kategori: ${catName}`);

            try {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                await sleep(3000);
                await autoScroll(page);

                const products = await page.evaluate(() => {
                    const items = [];
                    const cards = document.querySelectorAll('[class*="product-card"], [class*="productCard"], .product-listing-item, [data-product-id]');

                    cards.forEach(card => {
                        const nameEl = card.querySelector('[class*="product-name"], [class*="name"], .item-name, h3, h4');
                        const priceEl = card.querySelector('[class*="price"], [class*="amount"], .item-price');
                        const imgEl = card.querySelector('img');
                        const linkEl = card.querySelector('a');

                        const name = nameEl?.textContent?.trim();
                        const priceText = priceEl?.textContent?.trim();
                        const img = imgEl?.src || imgEl?.getAttribute('data-src') || '';
                        const href = linkEl?.href || '';

                        if (name && priceText) {
                            items.push({ name, priceText, img, href });
                        }
                    });
                    return items;
                });

                for (const p of products) {
                    const priceMatch = p.priceText.match(/(\d{1,5}[,\.]\d{2})/);
                    if (!priceMatch) continue;

                    const price = parseFloat(priceMatch[1].replace(',', '.'));
                    if (!price || price <= 0) continue;

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
