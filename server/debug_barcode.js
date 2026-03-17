import * as cheerio from 'cheerio';

const BASE_URL = 'https://marketkarsilastir.com';

async function testSearch(query) {
    const searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(query)}&type=name`;
    console.log(`🔍 Aranan URL: ${searchUrl}`);

    try {
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.log(`❌ HTTP Hatası: ${res.status}`);
            return;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Debug: Sayfa başlığı ve sonuç sayısı
        console.log(`📄 Sayfa Başlığı: ${$('title').text().trim()}`);

        const productCards = $('.product-card-clickable');
        console.log(`📦 Bulunan Kart Sayısı: ${productCards.length}`);

        if (productCards.length > 0) {
            console.log('--- İLK KART HTML DÖKÜMÜ ---');
            console.log(productCards.first().html());
            console.log('---------------------------');
            productCards.each((i, el) => {
                const name = $el.find('h6').first().text().trim();
                let href = $el.find('a[href*="/fiyat/"]').attr('href') || ($el.is('a') ? $el.attr('href') : null);
                console.log(`  [${i + 1}] Ürün: ${name}`);
                console.log(`      Link: ${href}`);

                if (href && href.includes('/fiyat/')) {
                    const eanMatch = href.match(/\/fiyat\/(\d{8,14})-/);
                    if (eanMatch) {
                        console.log(`      ✅ Barkod: ${eanMatch[1]}`);
                    } else {
                        console.log(`      ⚠️ Barkod regex eşleşmedi: ${href}`);
                    }
                }
            });
        } else {
            // HTML içinde barkod ara (fallback)
            const htmlMatch = html.match(/\/fiyat\/(\d{8,14})-/);
            if (htmlMatch) {
                console.log(`✅ HTML içinde barkod bulundu: ${htmlMatch[1]}`);
            } else {
                console.log('❌ Barkod bulunamadı.');
            }
        }
    } catch (err) {
        console.error('❌ Hata:', err.message);
    }
}

testSearch('Coca-Cola 1 L');
