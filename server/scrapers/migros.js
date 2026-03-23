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

import { guessCategory } from '../utils.js';

function parsePrice(text) {
    if (!text) return null;
    // Migros format: "15,90 TL" or "₺15.90"
    const cleaned = text.replace(/[^0-9,\.]/g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}

export async function scrapeMigros(db) {
    console.log('\n🟠 Migros scraping başlıyor (Tüm Kategoriler)...');

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

        /* Image blocking disabled to ensure data-src populates correctly */

        // Main Migros categories (from discovery script — main food/household categories)
        const mainCategories = [
            { slug: 'meyve-sebze-c-2', name: 'Meyve & Sebze' },
            { slug: 'et-tavuk-balik-c-3', name: 'Et, Tavuk, Balık' },
            { slug: 'sut-kahvaltilik-c-4', name: 'Süt & Kahvaltılık' },
            { slug: 'temel-gida-c-5', name: 'Temel Gıda' },
            { slug: 'icecek-c-6', name: 'İçecek' },
            { slug: 'atistirmalik-c-113fb', name: 'Atıştırmalık' },
            { slug: 'dondurma-c-41b', name: 'Dondurma' },
            { slug: 'firin-pastane-c-7e', name: 'Fırın & Pastane' },
            { slug: 'hazir-yemek-donuk-c-7d', name: 'Hazır Yemek & Donuk' },
            { slug: 'deterjan-temizlik-c-7', name: 'Deterjan & Temizlik' },
            { slug: 'kisisel-bakim-kozmetik-saglik-c-8', name: 'Kişisel Bakım' },
            { slug: 'kagit-islak-mendil-c-8d', name: 'Kağıt & Islak Mendil' },
            { slug: 'bebek-c-9', name: 'Bebek' },
            { slug: 'ev-yasam-c-a', name: 'Ev & Yaşam' },
            { slug: 'evcil-hayvan-c-a0', name: 'Evcil Hayvan' },
        ];

        for (const cat of mainCategories) {
            console.log(`\n  📂 ${cat.name}`);
            const catUrl = `https://www.migros.com.tr/${cat.slug}`;

            try {
                await page.goto(catUrl, { waitUntil: 'networkidle0', timeout: 60000 });
                await sleep(5000);

                // Find subcategories from sidebar
                const subCategories = await page.evaluate(() => {
                    const links = [];
                    const subCatEls = document.querySelectorAll('.filter__subcategories a');
                    subCatEls.forEach(a => {
                        const href = a.getAttribute('href') || '';
                        const text = a.textContent.trim().replace(/\s*\(\d+\)\s*/, '');
                        if (href && text) {
                            links.push({ href, text });
                        }
                    });
                    return links;
                });

                // Pages to visit: subcategories if available, otherwise main page
                const pagesToVisit = subCategories.length > 0
                    ? subCategories.map(s => ({
                        url: s.href.startsWith('http') ? s.href : `https://www.migros.com.tr${s.href}`,
                        name: s.text,
                    }))
                    : [{ url: catUrl, name: cat.name }];

                console.log(`    → ${pagesToVisit.length} alt kategori`);

                for (const subCat of pagesToVisit) {
                    console.log(`    📁 ${subCat.name}`);

                    try {
                        await page.goto(subCat.url, { waitUntil: 'networkidle0', timeout: 60000 });
                        await sleep(4000);

                        // Scroll to load all products (Migros uses lazy loading)
                        await deepAutoScroll(page);

                        // Extract products using Migros-specific selectors
                        const products = await page.evaluate(() => {
                            const items = [];
                            const seen = new Set();

                            // Migros uses sm-list-page-item cards
                            const cards = document.querySelectorAll('sm-list-page-item');

                            cards.forEach(card => {
                                // Get product link
                                const linkEl = card.querySelector('a[href*="-p-"]');
                                if (!linkEl) return;

                                const href = linkEl.getAttribute('href') || '';
                                if (seen.has(href)) return;
                                seen.add(href);

                                // Get product name from .product-name or img alt
                                const nameEl = card.querySelector('.product-name');
                                const imgEl = card.querySelector('img');
                                const name = nameEl?.textContent?.trim() || imgEl?.alt?.trim() || '';

                                if (!name || name.length < 2) return;

                                // Get price
                                const priceEl = card.querySelector('.sale-price, .price-content');
                                const priceText = priceEl?.textContent?.trim() || '';

                                // Get original/old price if discounted
                                const oldPriceEl = card.querySelector('.old-price, .strikethrough');
                                const oldPriceText = oldPriceEl?.textContent?.trim() || '';

                                // Get image
                                const imgSrc = imgEl?.src || imgEl?.getAttribute('data-src') || '';

                                items.push({
                                    name,
                                    priceText,
                                    oldPriceText,
                                    img: imgSrc,
                                    href: href.startsWith('http') ? href : `https://www.migros.com.tr${href}`,
                                });
                            });

                            // Fallback: if no sm-list-page-item, try product links directly
                            if (items.length === 0) {
                                const productLinks = document.querySelectorAll('a[href*="-p-"]');
                                productLinks.forEach(link => {
                                    const href = link.getAttribute('href') || '';
                                    if (seen.has(href)) return;
                                    seen.add(href);

                                    const parent = link.closest('mat-card') || link.parentElement?.parentElement;
                                    const nameEl = parent?.querySelector('.product-name');
                                    const imgEl = parent?.querySelector('img');
                                    const name = nameEl?.textContent?.trim() || imgEl?.alt?.trim() || '';

                                    if (!name || name.length < 2) return;

                                    const priceEl = parent?.querySelector('.sale-price, .price-content');
                                    const priceText = priceEl?.textContent?.trim() || '';
                                    const imgSrc = imgEl?.src || '';

                                    items.push({
                                        name,
                                        priceText,
                                        oldPriceText: '',
                                        img: imgSrc,
                                        href: href.startsWith('http') ? href : `https://www.migros.com.tr${href}`,
                                    });
                                });
                            }

                            return items;
                        });

                        let subCatCount = 0;
                        for (const p of products) {
                            const price = parsePrice(p.priceText);
                            if (!price || price <= 0) continue;

                            const originalPrice = parsePrice(p.oldPriceText);

                            const productId = upsertProduct(db, {
                                name: p.name,
                                brand: extractBrand(p.name),
                                category: guessCategory(subCat.url, p.name),
                                imageUrl: p.img,
                                sourceUrl: p.href.split('?')[0],
                            });

                            insertPrice(db, {
                                productId,
                                marketId: 'migros',
                                price,
                                originalPrice,
                            });

                            subCatCount++;
                            totalProducts++;
                        }

                        console.log(`      → ${subCatCount} ürün`);
                    } catch (err) {
                        console.warn(`      ❌ ${err.message.substring(0, 80)}`);
                    }

                    await sleep(2000);
                }

                // Save after each main category
                saveDb();
                console.log(`    ✅ ${cat.name} tamamlandı`);

            } catch (err) {
                console.warn(`    ❌ Kategori hatası: ${err.message.substring(0, 80)}`);
            }

            await sleep(2000);
        }

    } catch (err) {
        console.error('❌ Migros genel hata:', err.message);
    } finally {
        if (browser) await browser.close();
    }

    saveDb();
    console.log(`\n  ✅ Migros tamamlandı: ${totalProducts} ürün çekildi`);
    return { productsFound: totalProducts, pricesUpdated: totalProducts };
}

// Deep scroll for Migros (lazy loading)
async function deepAutoScroll(page) {
    let previousHeight = 0;
    let unchangedCount = 0;
    const scrollDistance = 600;

    for (let i = 0; i < 80; i++) {
        await page.evaluate((dist) => window.scrollBy(0, dist), scrollDistance);
        await sleep(800);

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

// Phase 2: Barcode search for Migros
export async function fetchPriceByBarcode(browser, barcode) {
    if (!barcode) return null;
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        const searchUrl = `https://www.migros.com.tr/arama?q=${barcode}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        await sleep(2500);

        const result = await page.evaluate(() => {
            const card = document.querySelector('sm-list-page-item') || document.querySelector('mat-card');
            if (!card) return null;
            const priceEl = card.querySelector('.sale-price, .price-content');
            const priceText = priceEl?.textContent?.trim() || '';
            const inStock = !document.body.innerText.includes('Tükendi');
            return { priceText, inStock };
        });

        if (!result || !result.priceText) return null;

        const cleaned = result.priceText.replace(/[^0-9,\.]/g, '').replace(',', '.');
        const val = parseFloat(cleaned);
        return { price: isNaN(val) ? null : val, inStock: result.inStock };
    } catch (err) {
        console.warn(`[Migros] Barkod hatasi (${barcode}): ${err.message}`);
        return null;
    } finally {
        if (page) await page.close();
    }
}
