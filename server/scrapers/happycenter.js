import axios from 'axios';
import * as cheerio from 'cheerio';
import { upsertProduct, insertPrice, saveDb } from '../db.js';

export async function scrapeHappyCenter(db) {
    console.log('\n🔵 Happy Center scraping başlıyor...');

    const categories = {
        'Taze_Ürünler/Manav': 'meyve-sebze',
        'Taze_Ürünler/Kasap_-_Şarküter_-_Açık_Bakliyat': 'et-tavuk',
        'Taze_Ürünler/Sütlük_Grubu': 'sut-urunleri',
        'Taze_Ürünler/Kahvaltılık': 'temel-gida',
        'Taze_Ürünler/Yoğurt_-_Dondurma': 'sut-urunleri',
        'Kuru_Gıda/Çay_-_Şeker_-_Bakliyat_-_Un_-_Makarna': 'temel-gida',
        'Kuru_Gıda/Konserve_-_Soslar_-_Unlu_Mamüller': 'temel-gida',
        'Kuru_Gıda/Çorba_-_Sıvı_Yağlar_-_Margarin': 'temel-gida',
        'Kuru_Gıda/Atıştırmalık': 'atistirmalik',
        'Kuru_Gıda/İçecek_Grubu': 'icecek',
        'Gıda_Dışı/Temizlik': 'temizlik',
        'Gıda_Dışı/Temizlik_Yardımcıları': 'temizlik',
        'Gıda_Dışı/Kozmetik': 'kisisel-bakim',
        'Gıda_Dışı/Hijyen_Bezleri_-_Bebe_Ürünleri': 'kisisel-bakim',
        'Gıda_Dışı/Hijyen_Bezleri_-_Bebe_Ürünleri/Bebek_Ürünleri': 'bebek',
    };

    let totalProducts = 0;
    let totalPrices = 0;

    for (const [route, categorySlug] of Object.entries(categories)) {
        console.log(`  📂 Kategori: ${route}`);
        let page = 1;
        let categoryCount = 0;

        while (page <= 50) {
            const url = `https://www.happycenter.com.tr/${route}?Page=${page}`;
            console.log(`    📄 Sayfa ${page}: ${url}`);

            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml',
                        'Accept-Language': 'tr-TR,tr;q=0.9',
                    }
                });

                const $ = cheerio.load(response.data);
                const products = $('.urun');

                if (products.length === 0) {
                    console.log(`    ⏹️ Ürün kalmadı, sonraki kategoriye geçiliyor.`);
                    break;
                }

                let pageCount = 0;

                products.each((_, el) => {
                    const $el = $(el);

                    const imgEl = $el.find('.resim img');
                    const name = imgEl.attr('title') || imgEl.attr('alt');
                    const localUrlPart = $el.find('.price a').attr('href');

                    if (!name) return;

                    const priceStr = $el.find('.price a').text().trim();
                    if (!priceStr) return;

                    const price = parseFloat(priceStr.replace('.', '').replace(',', '.'));
                    const imageUrl = imgEl.attr('src');
                    const sourceUrl = localUrlPart ? `https://www.happycenter.com.tr${localUrlPart}` : url;

                    if (!price || price <= 0) return;

                    const productId = upsertProduct(db, {
                        name,
                        brand: extractBrand(name),
                        category: categorySlug,
                        imageUrl: imageUrl || '',
                        sourceUrl: sourceUrl,
                        barcode: null
                    });

                    insertPrice(db, {
                        productId,
                        marketId: 'happycenter',
                        price,
                        originalPrice: null,
                    });

                    pageCount++;
                    categoryCount++;
                });

                console.log(`      → ${pageCount} ürün bulundu`);
                totalProducts += pageCount;
                totalPrices += pageCount;

                if (pageCount < 10) break;

                await sleep(1000);
                page++;

            } catch (error) {
                console.warn(`    ❌ Sayfa hatası: ${url}`, error.message);
                break;
            }
        }

        console.log(`    ✅ Kategori tamamlandı: ${categoryCount} ürün`);
        await sleep(2000);
    }

    console.log(`  ✅ Happy Center tamamlandı: ${totalProducts} ürün çekildi`);
    return { productsFound: totalProducts, pricesUpdated: totalPrices };
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Phase 2: Barcode search for Happy Center
export async function fetchPriceByBarcode(browser, barcode) {
    if (!barcode) return null;
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        const searchUrl = `https://www.happycenter.com.tr/arama?q=${barcode}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        await sleep(2500);

        const result = await page.evaluate(() => {
            const card = document.querySelector('.urun');
            if (!card) return null;
            const priceEl = card.querySelector('.price');
            const priceText = priceEl?.textContent?.trim() || '';
            const inStock = true; // Happy Center usually removes out of stock or puts "tükendi"
            return { priceText, inStock };
        });

        if (!result || !result.priceText) return null;

        const cleaned = result.priceText.replace(/[^0-9,\.]/g, '').replace(',', '.');
        const val = parseFloat(cleaned);
        return { price: isNaN(val) ? null : val, inStock: result.inStock };
    } catch (err) {
        console.warn(`[HappyCenter] Barkod hatasi (${barcode}): ${err.message}`);
        return null;
    } finally {
        if (page) await page.close();
    }
}
