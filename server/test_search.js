import * as cheerio from 'cheerio';

const BASE_URL = 'https://marketkarsilastir.com';

async function testSearch(query) {
    const searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(query)}&type=name`;
    console.log(`Searching: ${searchUrl}`);

    try {
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        // Log some HTML to see what's happening
        console.log(`HTML Length: ${html.length}`);

        const productCards = $('.product-card-clickable');
        console.log(`Product cards found: ${productCards.length}`);

        productCards.each((i, el) => {
            const $el = $(el);
            let href = $el.find('a[href*="/fiyat/"]').attr('href') || ($el.is('a') ? $el.attr('href') : null);
            console.log(`Card ${i}: ${href} - Text: ${$el.text().substring(0, 50)}`);
        });

        const htmlMatch = html.match(/\/fiyat\/(\d{8,14})-/);
        console.log(`HTML match: ${htmlMatch ? htmlMatch[1] : 'None'}`);

    } catch (err) {
        console.error(err);
    }
}

testSearch('Altınkılıç Kefirix');
