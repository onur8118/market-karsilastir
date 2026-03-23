import * as cheerio from 'cheerio';

async function checkPaging() {
    const cats = [
        'atistirmalik', 'bebek-anne', 'deterjan-temizlik', 'dondurma', 'elektronik',
        'et-tavuk-balik', 'ev-yasam', 'kitap-kirtasiye-oyuncak', 'kisisel-bakim-kozmetik',
        'meyve-sebze', 'meze-hazir-yemek-donuk', 'pet-shop', 'sut-kahvaltilik',
        'temel-gida', 'unlu-mamul-pasta', 'cicek-bahce', 'icecek'
    ];
    let totalEstimated = 0;

    console.log("Analyzing category pagination...");
    for (const cat of cats) {
        try {
            const res = await fetch(`https://marketkarsilastir.com/kategori/${cat}`);
            const html = await res.text();
            const $ = cheerio.load(html);

            // Try to find total products text if any, e.g. "1-20 / 300 ürün"
            let countText = $('body').text().match(/(\d+)\s+ürün/i);

            // Or find last page number
            let maxPage = 1;
            $('.pagination a, .page-link').each((i, el) => {
                const text = $(el).text().trim();
                const num = parseInt(text);
                if (!isNaN(num) && num > maxPage) maxPage = num;

                const href = $(el).attr('href');
                if (href) {
                    const m = href.match(/page=(\d+)/);
                    if (m && parseInt(m[1]) > maxPage) maxPage = parseInt(m[1]);
                }
            });

            // Assume 20 or 24 products per page (standard e-commerce)
            // Let's count items on first page to be sure
            const itemsOnPage = html.match(/\/fiyat\//g)?.length || 20; // rough estimate
            // The matches for /fiyat/ are likely 1 per product card, maybe 2 if there's img + title link
            // Assuming 20-30 products per page
            const itemsPerPage = 20;

            const est = maxPage * itemsPerPage;
            console.log(`Cat: ${cat} -> Max Page: ${maxPage} -> ~${est} products`);
            totalEstimated += est;
        } catch (e) {
            console.log(`Cat: ${cat} err:`, e.message);
        }
    }
    console.log("------------------------");
    console.log("TOTAL ESTIMATED PRODUCTS:", totalEstimated);
}
checkPaging().catch(console.error);
