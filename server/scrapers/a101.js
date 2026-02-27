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
        'Sek', 'Milka', 'Bizim', 'Becel', 'Molfix', 'Prima',
        'Huggies', 'Superfresh', 'Birşah', 'Altınkılıç',
        'Tamek', 'Dimes', 'Cappy', 'Beypazarı', 'Kınık',
        'Bahçıvan', 'Tahsildaroğlu', 'Muratbey', 'Yaşar',
    ];
    for (const brand of brands) {
        if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
    }
    return name.split(' ')[0];
}

const CATEGORY_MAP = {
    'sut-urunleri-kahvaltilik': 'sut-urunleri',
    'meyve-sebze': 'meyve-sebze',
    'et-tavuk-sarkuteri': 'et-tavuk',
    'temel-gida': 'temel-gida',
    'atistirmalik': 'atistirmalik',
    'su-icecek': 'icecek',
    'donuk-hazir-yemek-meze': 'dondurulmus',
    'dondurulmus-urunler': 'dondurulmus',
    'temizlik-urunleri': 'temizlik',
    'kagit-urunleri': 'temizlik',
    'kisisel-bakim': 'kisisel-bakim',
    'anne-bebek': 'bebek',
    'firindan': 'temel-gida',
    'evcil-hayvan': 'temel-gida',
};

function guessCategory(url, name) {
    const n = (name || '').toLowerCase();
    // Keywords have priority for snacks
    if (/çikolata|gofret|bisküvi|biskuvi|cips|kraker|nutella|doritos|helva|kek|kuruyemiş|kuruyemis|sakız|sakiz|sekerleme|şekerleme|chips/.test(n)) return 'atistirmalik';

    const urlLower = (url || '').toLowerCase();
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (urlLower.includes(key)) return val;
    }

    if (/süt|yoğurt|peynir|ayran|tereyağ|krema|kaşar|lor/.test(n)) return 'sut-urunleri';
    if (/su |cola|fanta|sprite|meyve suyu|çay|kahve|nescafe|lipton|soda/.test(n)) return 'icecek';
    if (/deterjan|çamaşır|bulaşık|domestos|fairy|temiz|çöp|tuvalet/.test(n)) return 'temizlik';
    if (/şampuan|sabun|diş|deodorant|krem|bakım|duş/.test(n)) return 'kisisel-bakim';
    if (/makarna|pirinç|un |yağ|tuz|şeker|salça|konserve|çorba|bulgur/.test(n)) return 'temel-gida';
    if (/dondurma|dondurulmuş/.test(n)) return 'atistirmalik';
    if (/elma|portakal|domates|biber|muz|üzüm/.test(n)) return 'meyve-sebze';
    if (/tavuk|et |dana|kıyma|köfte|sucuk|sosis|jambon/.test(n)) return 'et-tavuk';
    return 'temel-gida';
}

export async function scrapeA101(db) {
    console.log('\n🔵 A101 scraping başlıyor (A101 Kapıda — Tüm Alt Kategoriler)...');

    let browser;
    let totalProducts = 0;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080',
            ],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // A101 Kapıda — All main categories (exactly as user described)
        const mainCategories = [
            'meyve-sebze',
            'et-tavuk-sarkuteri',
            'sut-urunleri-kahvaltilik',
            'firindan',
            'temel-gida',
            'atistirmalik',
            'su-icecek',
            'donuk-hazir-yemek-meze',
            'dondurulmus-urunler',
            'temizlik-urunleri',
            'kisisel-bakim',
            'kagit-urunleri',
            'anne-bebek',
            'evcil-hayvan',
        ];

        // First, dismiss cookie on any page
        console.log('  🌐 A101 Kapıda açılıyor...');
        await page.goto('https://www.a101.com.tr/kapida', {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });
        try {
            await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', { timeout: 5000 });
            await sleep(1000);
        } catch (e) { }

        for (const mainCat of mainCategories) {
            console.log(`\n  📂 Ana Kategori: ${mainCat}`);
            const mainUrl = `https://www.a101.com.tr/kapida/${mainCat}`;

            try {
                // Navigate to main category
                await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                await sleep(2000);

                // Discover subcategories
                const subCategories = await page.evaluate((catSlug) => {
                    const links = [];
                    const allLinks = document.querySelectorAll(`a[href*="/kapida/${catSlug}/"]`);
                    const seen = new Set();
                    allLinks.forEach(a => {
                        const href = a.getAttribute('href') || '';
                        if (seen.has(href)) return;
                        seen.add(href);
                        if (href.includes('_p-')) return; // product link, not category
                        if (href.includes('?')) return; // query params
                        const text = a.textContent.trim();
                        if (text.length > 0 && text.length < 50) {
                            links.push({ href, text });
                        }
                    });
                    return links;
                }, mainCat);

                // If there are subcategories, visit each one
                const urlsToVisit = subCategories.length > 0
                    ? subCategories.map(s => ({
                        url: s.href.startsWith('http') ? s.href : `https://www.a101.com.tr${s.href}`,
                        name: s.text,
                    }))
                    : [{ url: mainUrl, name: mainCat }]; // fallback: scrape main page

                console.log(`    → ${urlsToVisit.length} alt kategori bulundu`);

                for (const subCat of urlsToVisit) {
                    console.log(`    📁 ${subCat.name}`);

                    try {
                        await page.goto(subCat.url, { waitUntil: 'networkidle2', timeout: 60000 });
                        await sleep(2000);

                        // Scroll to load all products
                        await deepAutoScroll(page);

                        // Extract products using the correct A101 card structure
                        const products = await page.evaluate(() => {
                            const items = [];
                            const seen = new Set();

                            // A101 product cards: div with "cursor-pointer rounded-2xl" or similar
                            // Testing shows products are often in div.cursor-pointer or inside <h3>
                            const allCards = document.querySelectorAll('div.cursor-pointer, div.rounded-2xl');

                            allCards.forEach(card => {
                                // Find the product link
                                const link = card.querySelector('a[href*="_p-"]');
                                if (!link) return;

                                const href = link.getAttribute('href') || '';
                                if (seen.has(href)) return;
                                seen.add(href);

                                // Get product name from h3 or img alt or text div
                                const h3 = card.querySelector('h3');
                                const img = link.querySelector('img');
                                let name = h3?.textContent?.trim() || img?.getAttribute('alt')?.trim() || '';

                                // Also check for text divs inside the card if still no name
                                if (!name) {
                                    const textDivs = card.querySelectorAll('div');
                                    for (const div of textDivs) {
                                        const t = div.textContent.trim();
                                        if (t.length > 3 && t.length < 200 && !t.includes('₺') && !t.includes('Sepete')) {
                                            name = t;
                                            break;
                                        }
                                    }
                                }

                                if (!name || name.length < 2) return;

                                // Get price from card text
                                const cardText = card.textContent || '';
                                const priceMatches = cardText.match(/₺\s*([\d.,]+)/g);
                                if (!priceMatches || priceMatches.length === 0) return;

                                const prices = priceMatches.map(m => {
                                    const cleaned = m.replace('₺', '').trim().replace(',', '.');
                                    return parseFloat(cleaned);
                                }).filter(v => !isNaN(v) && v > 0);

                                if (prices.length === 0) return;

                                // Check for line-through (old price)
                                const lineThroughEl = card.querySelector('.line-through');
                                const lineThroughText = lineThroughEl?.textContent?.trim() || '';
                                let originalPrice = null;
                                let price = null;

                                if (lineThroughText && lineThroughText.includes('₺')) {
                                    const oldMatch = lineThroughText.match(/₺\s*([\d.,]+)/);
                                    if (oldMatch) {
                                        originalPrice = parseFloat(oldMatch[1].replace(',', '.'));
                                    }
                                    price = Math.min(...prices);
                                } else {
                                    price = prices[0];
                                }

                                if (!price || price <= 0) return;

                                const imgSrc = img?.getAttribute('src') || '';
                                const hiResImg = imgSrc.replace('_128x128', '_256x256');

                                items.push({
                                    name,
                                    price,
                                    originalPrice,
                                    img: hiResImg,
                                    href: href.startsWith('http') ? href : `https://www.a101.com.tr${href}`,
                                });
                            });

                            return items;
                        });

                        let subCatCount = 0;
                        for (const p of products) {
                            const productId = upsertProduct(db, {
                                name: p.name,
                                brand: extractBrand(p.name),
                                category: guessCategory(subCat.url, p.name),
                                imageUrl: p.img,
                                sourceUrl: p.href.split('?')[0], // Clean URL
                            });

                            insertPrice(db, {
                                productId,
                                marketId: 'a101',
                                price: p.price,
                                originalPrice: p.originalPrice,
                            });

                            subCatCount++;
                            totalProducts++;
                        }

                        console.log(`      → ${subCatCount} ürün`);
                    } catch (err) {
                        console.warn(`      ❌ Alt kategori hatası: ${err.message.substring(0, 80)}`);
                    }

                    await sleep(2000);
                }

                // Save after each main category
                saveDb();
                console.log(`    ✅ ${mainCat} tamamlandı`);

            } catch (err) {
                console.warn(`    ❌ Kategori hatası: ${err.message.substring(0, 80)}`);
            }

            await sleep(2000);
        }

    } catch (err) {
        console.error('❌ A101 genel hata:', err.message);
    } finally {
        if (browser) await browser.close();
    }

    saveDb();
    console.log(`\n  ✅ A101 tamamlandı: ${totalProducts} ürün çekildi`);
    return { productsFound: totalProducts, pricesUpdated: totalProducts };
}

// Deep scroll — keeps scrolling until no new content loads
async function deepAutoScroll(page) {
    let previousHeight = 0;
    let unchangedCount = 0;
    const scrollDistance = 600;

    for (let i = 0; i < 80; i++) {
        await page.evaluate((dist) => window.scrollBy(0, dist), scrollDistance);
        await sleep(600);

        const currentHeight = await page.evaluate(() => document.body.scrollHeight);

        if (currentHeight === previousHeight) {
            unchangedCount++;
            if (unchangedCount >= 4) break;
            await sleep(1000);
        } else {
            unchangedCount = 0;
        }
        previousHeight = currentHeight;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
