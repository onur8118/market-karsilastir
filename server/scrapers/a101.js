import puppeteer from 'puppeteer';
import { upsertProduct, insertPrice, saveDb } from '../db.js';

function extractBrand(name) {
    const brands = [
        'Sütaş', 'Pınar', 'İçim', 'Mis', 'Ülker', 'Eti', 'Torku',
        'Coca-Cola', 'Pepsi', 'Fanta', 'Sprite', 'Nescafe', 'Nescafé',
        'Lipton', 'Doğadan', 'Erikli', 'Damla', 'Hayat',
        'Nutella', 'Barilla', 'Knorr', 'Calve', 'Maggi',
        'Domestos', 'Fairy', 'Bingo', 'Ace', 'Persil', 'Ariel',
        'Head&Shoulders', 'Pantene', 'Clear', 'Dove', 'Rexona',
        'Colgate', 'Signal', 'Dalan', 'Hobby',
        "Lay's", 'Doritos', 'Ruffles', 'Cheetos',
        'Algida', 'Magnum', 'Yudum', 'Komili', 'Kristal',
        'Reis', 'Duru', 'Filiz', 'Banvit', 'Namet',
        'Tadelle', 'Albeni', 'Halley', 'Sana', 'Luna',
    ];
    for (const brand of brands) {
        if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
    }
    return name.split(' ')[0];
}

function guessCategory(name) {
    const n = name.toLowerCase();
    if (/süt|yoğurt|peynir|ayran|tereyağ|krema|kaşar/.test(n)) return 'sut-urunleri';
    if (/su |cola|fanta|sprite|meyve suyu|çay|kahve|nescafe|lipton|icecek|soda/.test(n)) return 'icecek';
    if (/çikolata|gofret|bisküvi|cips|kraker|şekerleme|nutella|doritos|lay|helva/.test(n)) return 'atistirmalik';
    if (/deterjan|çamaşır|bulaşık|domestos|fairy|temiz|çöp|tuvalet/.test(n)) return 'temizlik';
    if (/şampuan|sabun|diş|deodorant|krem|bakım|duş/.test(n)) return 'kisisel-bakim';
    if (/makarna|pirinç|un |yağ|tuz|şeker|salça|konserve|çorba|bulgur/.test(n)) return 'temel-gida';
    if (/dondurma|dondurumuş/.test(n)) return 'dondurulmus';
    if (/elma|portakal|domates|biber|salatalık|muz/.test(n)) return 'meyve-sebze';
    if (/tavuk|et |dana|kıyma|köfte|sucuk|sosis/.test(n)) return 'et-tavuk';
    return 'temel-gida';
}

export async function scrapeA101(db) {
    console.log('\n🔵 A101 scraping başlıyor...');

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
            'https://www.a101.com.tr/market/sut-ve-sut-urunleri/',
            'https://www.a101.com.tr/market/icecekler/',
            'https://www.a101.com.tr/market/temel-gida/',
            'https://www.a101.com.tr/market/atistirmalik/',
            'https://www.a101.com.tr/market/temizlik-urunleri/',
            'https://www.a101.com.tr/market/kisisel-bakim/',
        ];

        for (const url of categoryUrls) {
            console.log(`  📂 Kategori: ${url.split('/market/')[1]?.replace('/', '')}`);

            try {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                await sleep(2000);

                // Auto-scroll to load lazy content
                await autoScroll(page);

                const products = await page.evaluate(() => {
                    const items = [];

                    // A101 product selectors
                    const cards = document.querySelectorAll('.product-card, .product-item, [class*="product"], article[class*="card"]');

                    cards.forEach(card => {
                        const nameEl = card.querySelector('.product-name, .name, h3, h4, [class*="name"], [class*="title"]');
                        const priceEl = card.querySelector('.current-price, .price, [class*="price"]:not([class*="old"])');
                        const oldPriceEl = card.querySelector('.old-price, .line-through, [class*="old"], [class*="prev"]');
                        const imgEl = card.querySelector('img');
                        const linkEl = card.querySelector('a');

                        const name = nameEl?.textContent?.trim();
                        const priceText = priceEl?.textContent?.trim();
                        const oldPriceText = oldPriceEl?.textContent?.trim();
                        const img = imgEl?.src || imgEl?.getAttribute('data-src') || '';
                        const href = linkEl?.href || '';

                        if (name && priceText) {
                            items.push({ name, priceText, oldPriceText, img, href });
                        }
                    });
                    return items;
                });

                for (const p of products) {
                    const price = parseFloat(p.priceText.replace(/[^\d,\.]/g, '').replace(',', '.'));
                    const oldPrice = p.oldPriceText ? parseFloat(p.oldPriceText.replace(/[^\d,\.]/g, '').replace(',', '.')) : null;

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
                        marketId: 'a101',
                        price,
                        originalPrice: oldPrice,
                    });

                    totalProducts++;
                    totalPrices++;
                }

                console.log(`    → ${products.length} ürün bulundu`);
            } catch (err) {
                console.warn(`    ❌ Kategori hatası: ${err.message}`);
            }

            await sleep(3000); // Rate limiting
        }

    } catch (err) {
        console.error('❌ A101 genel hata:', err.message);
    } finally {
        if (browser) await browser.close();
    }

    saveDb();
    console.log(`  ✅ A101 tamamlandı: ${totalProducts} ürün, ${totalPrices} fiyat`);
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
