import * as cheerio from 'cheerio';

async function fetchHtml() {
    const res = await fetch('https://marketkarsilastir.com/fiyat/8691381000035-beypazari-maden-suyu-6x200-ml');
    const html = await res.text();
    const $ = cheerio.load(html);

    let foundHtml = '';
    $('p, div').filter((_, el) => {
        const t = $(el).text().trim();
        return t.includes('İçindekiler');
    }).each((_, el) => {
        const h = $(el).html();
        if (h.length < 1000) {
            console.log("---- HTML ----");
            console.log(h);
        }
    });

}

fetchHtml().catch(console.error);
