const CATEGORY_MAP = {
    'meyve-sebze': 'meyve-sebze',
    'et-tavuk': 'et-tavuk',
    'sut-urunleri': 'sut-urunleri',
    'temel-gida': 'temel-gida',
    'icecek': 'icecek',
    'atistirmalik': 'atistirmalik',
    'dondurulmus': 'dondurulmus',
    'temizlik': 'temizlik',
    'kisisel-bakim': 'kisisel-bakim',
    'bebek': 'bebek'
};

const EXCLUSIONS = {
    'sut-urunleri': [/tatlı/, /tatli/, /nuriye/, /börek/, /borek/, /dondurma/, /çikolata/, /cikolata/, /gofret/, /bisküvi/, /biskuvi/, /kek/, /pasta/, /helva/, /baklava/, /makarna/],
    'et-tavuk': [/çorba/, /corba/, /bulyon/, /sos/, /harç/, /harc/, /noodle/, /makarna/, /mantı/, /manti/],
    'meyve-sebze': [/kolonya/, /sabun/, /şampuan/, /sampuan/, /deterjan/, /temizleyici/],
};

/**
 * Ürün ismi ve URL'sine bakarak kategori tahmini yapar.
 * Hiyerarşik bir kontrol sırası izler.
 */
export function guessCategory(url, name) {
    const n = (name || '').toLowerCase();
    const urlLower = (url || '').toLowerCase();

    // 1. Önce en spesifik ve kritik kategorileri kontrol et (Bezi, Mama vb.)
    if (/\bbebek\b|mama|bezi|biberon|dalin|prima|molfix|huggies|sleepy/.test(n)) {
        return 'bebek';
    }

    // 2. URL'de net bir kategori slug'ı varsa ona güven
    const slugs = urlLower.split(/[\/\-_]/);
    for (const slug of slugs) {
        if (CATEGORY_MAP[slug]) {
            // Hariç tutma kurallarını kontrol et
            const targetCat = CATEGORY_MAP[slug];
            if (EXCLUSIONS[targetCat] && EXCLUSIONS[targetCat].some(rx => rx.test(n))) {
                continue; // Bu slug bu ürün için uygun değil
            }
            return targetCat;
        }
    }

    // 3. Marka/Öncelik Odaklı Anahtar Kelimeler
    if (/çikolata|cikolata|gofret|kek|bisküvi|biskuvi|cips|kraker|jelibon|bonibon/.test(n)) return 'atistirmalik';
    if (/deterjan|çamaşır suyu|yumuşatıcı|bulaşık tableti|domestos|fairy|ariel|alo/.test(n)) return 'temizlik';
    if (/şampuan|sampuan|kolonya|deodorant|diş macunu|sabun|duş jeli/.test(n)) return 'kisisel-bakim';
    if (/süt|sut|yoğurt|yogurt|peynir|ayran|kaşar|lor|labne/.test(n)) {
        if (!EXCLUSIONS['sut-urunleri'].some(rx => rx.test(n))) return 'sut-urunleri';
    }

    // 4. Fallback: Temel Gıda
    if (/et |dana|kıyma|tavuk|piliç|sucuk|sosis/.test(n)) return 'et-tavuk';
    if (/su |cola|fanta|sprite|meyve suyu|çay|kahve/.test(n)) return 'icecek';
    if (/elma|domates|biber|muz|patates|soğan|sogan|kivi|kavun|karpuz|havuç|havuc|limon|salatalık|salatalik|marul|maydanoz|dereotu|kabak|patlıcan|patlican|çilek|cilek|armut|şeftali|seftali|üzüm|uzum|kayısı|kayisi|erik|kiraz|vişne|visne|avokado|brokoli|karnabahar|lahana|ıspanak|ispanak|pırasa|pirasa|enginar|kereviz|turp|sarımsak|sarimsak/.test(n)) return 'meyve-sebze';

    return 'temel-gida';
}
