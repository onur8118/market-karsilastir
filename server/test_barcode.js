import * as cheerio from 'cheerio';

async function test() {
    const res = await fetch('https://marketkarsilastir.com/fiyat/8691381000035-beypazari-maden-suyu-6x200-ml', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Find barcode 8691381000035
    let found = false;
    $('*').each((i, el) => {
        if ($(el).children().length === 0 && $(el).text().includes('8691381000035')) {
            console.log('Tag:', el.tagName);
            console.log('Class:', $(el).attr('class'));
            console.log('Parent HTML:', $(el).parent().html().substring(0, 200));
            found = true;
        }
    });

    if (!found) {
        console.log("Not found directly in leaf nodes. Let's look for text nodes.");
        // A generic search for the barcode string
        const index = html.indexOf('8691381000035');
        console.log("HTML index:", index);
        if (index > -1) {
            console.log(html.substring(index - 100, index + 100));
        }
    }
}
test().catch(console.error);
