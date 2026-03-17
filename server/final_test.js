import * as cheerio from 'cheerio';

async function testSingle() {
    const query = 'Coca-Cola 1 L';
    const url = `https://marketkarsilastir.com/ara?q=${encodeURIComponent(query)}&type=name`;
    console.log(`🔍 Test URL: ${url}`);

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const card = $('.product-card-clickable').first();

    let foundBarcode = null;
    const name = card.find('.product-name, h6').first().text().trim();
    const imgSrc = card.find('img.product-image').attr('src');
    const onClick = card.find('button.btn-add-to-cart').attr('onclick');

    if (imgSrc) {
        const imgMatch = imgSrc.match(/\/(\d{8,14})\./);
        if (imgMatch) foundBarcode = imgMatch[1];
    }
    if (!foundBarcode && onClick) {
        const clickMatch = onClick.match(/'(\d{8,14})'/);
        if (clickMatch) foundBarcode = clickMatch[1];
    }

    console.log(`📦 Ürün: ${name}`);
    console.log(`🖼️ Resim: ${imgSrc}`);
    console.log(`🔘 Buton: ${onClick}`);
    console.log(`✅ Bulunan Barkod: ${foundBarcode}`);
}

testSingle().catch(console.error);
