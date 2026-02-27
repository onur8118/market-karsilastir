import * as cheerio from 'cheerio';
import { upsertProduct, insertPrice, saveDb } from '../db.js';

const CATEGORY_MAP = {
    'sut-ve-sut-urunleri': 'sut-urunleri',
    'icecek': 'icecek',
    'kahvaltilik': 'temel-gida',
    'yemeklik-malzemeler': 'temel-gida',
    'atistirmaliklar': 'atistirmalik',
    'temizlik': 'temizlik',
    'kisisel-bakim-ve-kozmetik': 'kisisel-bakim',
    'meyve-ve-sebze': 'meyve-sebze',
    'et-ve-tavuk-ve-sarkuteri': 'et-tavuk',
    'anne-bebek-ve-cocuk': 'bebek',
};

function guessCategory(url, name) {
    const urlLower = (url || '').toLowerCase();
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (urlLower.includes(key)) return val;
    }
    // Fallback: guess from name
    const n = (name || '').toLowerCase();
    if (/süt|yoğurt|peynir|ayran|tereyağ|krema|kaşar/.test(n)) return 'sut-urunleri';
    if (/su |cola|fanta|sprite|meyve suyu|çay|kahve|nescafe|lipton|soda|ayran/.test(n)) return 'icecek';
    if (/çikolata|gofret|bisküvi|cips|kraker|nutella|doritos|helva|kek/.test(n)) return 'atistirmalik';
    if (/deterjan|çamaşır|bulaşık|domestos|fairy|temiz|çöp/.test(n)) return 'temizlik';
    if (/şampuan|sabun|diş|deodorant|krem|bakım|duş/.test(n)) return 'kisisel-bakim';
    if (/makarna|pirinç|un |yağ|tuz|şeker|salça|konserve|çorba|bulgur/.test(n)) return 'temel-gida';
    if (/dondurma/.test(n)) return 'atistirmalik';
    return 'temel-gida';

}

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
        'Algida', 'Magnum', "Carte d'Or",
        'Yudum', 'Komili', 'Kristal', 'Bizim',
        'Reis', 'Duru', 'Filiz', 'Superfresh', 'Banvit', 'Namet',
        'Molfix', 'Prima', 'Huggies', 'Sana', 'Becel', 'Luna',
        'Tadelle', 'Albeni', 'Halley', 'Anavarza', 'Taşkale',
        'Sek', 'Disney', 'Milka',
    ];
    for (const brand of brands) {
        if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
    }
    return name.split(' ')[0];
}

function parsePrice(priceStr) {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^\d,\.]/g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}

// Scrape all products for a category across multiple pages
async function scrapeCategory(db, baseUrl) {
    let page = 1;
    let categoryProductsCount = 0;
    const catSlug = baseUrl.split('/').pop().replace(/-c-\d+$/, '');

    while (page <= 50) { // Safety limit of 50 pages
        const url = `${baseUrl}?page=${page}`;
        console.log(`    📄 Sayfa ${page}: ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'tr-TR,tr;q=0.9',
                }
            });

            if (!response.ok) {
                console.warn(`    ⚠️ Sayfa yüklenemedi: ${url} (${response.status})`);
                break;
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            let pageProducts = 0;

            // ŞOK's product structure: links like /product-slug-p-ID with price text inside
            const productLinks = $('a[href*="-p-"]');
            if (productLinks.length === 0) {
                console.log(`    ⏹️ Daha fazla ürün bulunamadı (Sayfa ${page})`);
                break;
            }

            productLinks.each((_, el) => {
                const $el = $(el);
                const href = $el.attr('href') || '';
                const fullUrl = href.startsWith('http') ? href : `https://www.sokmarket.com.tr${href}`;
                const textContent = $el.text().trim();

                if (!textContent || textContent.length < 5) return;

                // Extract prices from text: "Product Name55,00₺49,90₺" or "Product Name29,90₺"
                const pricePattern = /(\d{1,5}[,\.]\d{2})\s*₺/g;
                const priceMatches = [...textContent.matchAll(pricePattern)];

                if (priceMatches.length === 0) return;

                // Product name = text before the first price
                const firstPriceIndex = textContent.indexOf(priceMatches[0][0]);
                const name = textContent.substring(0, firstPriceIndex).trim();

                if (!name || name.length < 3) return;

                let price = null;
                let originalPrice = null;

                if (priceMatches.length >= 2) {
                    originalPrice = parsePrice(priceMatches[0][1]);
                    price = parsePrice(priceMatches[1][1]);
                    if (price && originalPrice && price > originalPrice) {
                        [price, originalPrice] = [originalPrice, price];
                    }
                } else {
                    price = parsePrice(priceMatches[0][1]);
                }

                if (!price || price <= 0) return;

                const img = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
                const brand = extractBrand(name);
                const category = guessCategory(baseUrl, name);

                const productId = upsertProduct(db, {
                    name,
                    brand,
                    category,
                    imageUrl: img,
                    sourceUrl: fullUrl,
                });

                insertPrice(db, {
                    productId,
                    marketId: 'sok',
                    price,
                    originalPrice,
                });

                pageProducts++;
                categoryProductsCount++;
            });

            console.log(`      → ${pageProducts} yeni ürün`);

            if (pageProducts < 10) { // Likely reached end or partial page
                break;
            }

            // Rate limiting between pages
            await sleep(1000);
            page++;

        } catch (err) {
            console.warn(`    ❌ Sayfa hatası: ${url}`, err.message);
            break;
        }
    }

    return categoryProductsCount;
}

export async function scrapeSok(db) {
    console.log('\n🟡 ŞOK Market scraping başlıyor (Gelişmiş - Tüm Sayfalar)...');

    const categoryUrls = [
        'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460',
        'https://www.sokmarket.com.tr/icecek-c-20505',
        'https://www.sokmarket.com.tr/kahvaltilik-c-890',
        'https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770',
        'https://www.sokmarket.com.tr/atistirmaliklar-c-20376',
        'https://www.sokmarket.com.tr/temizlik-c-20647',
        'https://www.sokmarket.com.tr/kisisel-bakim-ve-kozmetik-c-20395',
        'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20',
        'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160',
        'https://www.sokmarket.com.tr/kagit-urunler-c-20875',
        'https://www.sokmarket.com.tr/anne-bebek-ve-cocuk-c-20634',
        'https://www.sokmarket.com.tr/ev-ve-yasam-c-20898',
    ];

    let totalProducts = 0;

    for (const url of categoryUrls) {
        const catSlug = url.split('/').pop().replace(/-c-\d+$/, '');
        console.log(`  📂 Kategori: ${catSlug}`);

        const count = await scrapeCategory(db, url);
        totalProducts += count;

        console.log(`    ✅ Kategori tamamlandı: ${count} toplam ürün`);

        // Rate limiting between categories
        await sleep(2000);
    }

    saveDb();
    console.log(`  ✅ ŞOK tamamlandı: ${totalProducts} ürün çekildi`);

    return { productsFound: totalProducts, pricesUpdated: totalProducts };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
