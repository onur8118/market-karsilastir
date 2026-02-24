// Product image helper - generates nice SVG placeholders with category colors
const categoryColors = {
    'icecek': { bg: '#EEF2FF', fg: '#4F46E5', emoji: '🥤' },
    'sut-urunleri': { bg: '#F0FDF4', fg: '#16A34A', emoji: '🧀' },
    'atistirmalik': { bg: '#FFF7ED', fg: '#EA580C', emoji: '🍫' },
    'temizlik': { bg: '#F0F9FF', fg: '#0284C7', emoji: '🧹' },
    'kisisel-bakim': { bg: '#FDF4FF', fg: '#C026D3', emoji: '🧴' },
    'temel-gida': { bg: '#FEFCE8', fg: '#CA8A04', emoji: '🌾' },
    'meyve-sebze': { bg: '#F0FDF4', fg: '#16A34A', emoji: '🍎' },
    'et-tavuk': { bg: '#FEF2F2', fg: '#DC2626', emoji: '🥩' },
    'dondurulmus': { bg: '#EFF6FF', fg: '#2563EB', emoji: '🧊' },
    'bebek': { bg: '#FFF1F2', fg: '#E11D48', emoji: '👶' }
};

function makeProductImage(name, category) {
    const colors = categoryColors[category] || { bg: '#F3F4F6', fg: '#6B7280', emoji: '📦' };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="16" fill="${colors.bg}"/>
    <text x="100" y="90" text-anchor="middle" font-size="60">${colors.emoji}</text>
    <text x="100" y="135" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="600" fill="${colors.fg}">${escapeXml(name.length > 24 ? name.substring(0, 22) + '…' : name)}</text>
  </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export const products = [
    {
        id: 1,
        name: 'Nutella 750 G',
        brand: 'Nutella',
        category: 'atistirmalik',
        barcode: '80176800',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 269.00, date: '2026-02-20' },
            { marketId: 'bim', price: 274.50, date: '2026-02-20' },
            { marketId: 'migros', price: 289.00, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 264.00, date: '2026-02-20' },
            { marketId: 'sok', price: 279.90, date: '2026-02-20' },
            { marketId: 'metro', price: 272.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'CarrefourSA', price: 219.00 },
            { date: '2025-10-01', market: 'CarrefourSA', price: 229.00 },
            { date: '2025-11-01', market: 'CarrefourSA', price: 239.95 },
            { date: '2025-12-01', market: 'CarrefourSA', price: 249.00 },
            { date: '2026-01-01', market: 'CarrefourSA', price: 259.00 },
            { date: '2026-02-01', market: 'CarrefourSA', price: 264.00 }
        ]
    },
    {
        id: 2,
        name: 'Coca-Cola 1 L',
        brand: 'Coca-Cola',
        category: 'icecek',
        barcode: '86924709',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 42.50, date: '2026-02-20' },
            { marketId: 'bim', price: 44.90, date: '2026-02-20' },
            { marketId: 'migros', price: 49.48, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 46.50, date: '2026-02-20' },
            { marketId: 'sok', price: 43.90, date: '2026-02-20' },
            { marketId: 'metro', price: 45.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Migros', price: 39.00 },
            { date: '2025-10-01', market: 'Migros', price: 41.50 },
            { date: '2025-11-01', market: 'Migros', price: 44.00 },
            { date: '2025-12-01', market: 'Migros', price: 46.00 },
            { date: '2026-01-01', market: 'Migros', price: 48.00 },
            { date: '2026-02-01', market: 'Migros', price: 49.48 }
        ]
    },
    {
        id: 3,
        name: 'Sütaş 200 Ml Ayran',
        brand: 'Sütaş',
        category: 'sut-urunleri',
        barcode: '86900123',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 7.00, date: '2026-02-20' },
            { marketId: 'bim', price: 7.50, date: '2026-02-20' },
            { marketId: 'migros', price: 8.25, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 7.90, date: '2026-02-20' },
            { marketId: 'sok', price: 7.25, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 5.50 },
            { date: '2025-10-01', market: 'A101', price: 5.75 },
            { date: '2025-11-01', market: 'A101', price: 6.00 },
            { date: '2025-12-01', market: 'A101', price: 6.50 },
            { date: '2026-01-01', market: 'A101', price: 6.75 },
            { date: '2026-02-01', market: 'A101', price: 7.00 }
        ]
    },
    {
        id: 4,
        name: 'Ülker Çikolatalı Gofret 36 G',
        brand: 'Ülker',
        category: 'atistirmalik',
        barcode: '86900456',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 9.50, date: '2026-02-20' },
            { marketId: 'bim', price: 9.90, date: '2026-02-20' },
            { marketId: 'migros', price: 11.75, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 10.50, date: '2026-02-20' },
            { marketId: 'sok', price: 9.75, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 7.50 },
            { date: '2025-10-01', market: 'A101', price: 8.00 },
            { date: '2025-11-01', market: 'A101', price: 8.50 },
            { date: '2025-12-01', market: 'A101', price: 9.00 },
            { date: '2026-01-01', market: 'A101', price: 9.25 },
            { date: '2026-02-01', market: 'A101', price: 9.50 }
        ]
    },
    {
        id: 5,
        name: 'Pınar Tam Yağlı Süt 1 L',
        brand: 'Pınar',
        category: 'sut-urunleri',
        barcode: '86900789',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 44.50, date: '2026-02-20' },
            { marketId: 'bim', price: 45.90, date: '2026-02-20' },
            { marketId: 'migros', price: 47.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 46.50, date: '2026-02-20' },
            { marketId: 'sok', price: 45.00, date: '2026-02-20' },
            { marketId: 'metro', price: 44.90, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Migros', price: 36.00 },
            { date: '2025-10-01', market: 'Migros', price: 38.50 },
            { date: '2025-11-01', market: 'Migros', price: 40.00 },
            { date: '2025-12-01', market: 'Migros', price: 42.00 },
            { date: '2026-01-01', market: 'Migros', price: 45.00 },
            { date: '2026-02-01', market: 'Migros', price: 47.90 }
        ]
    },
    {
        id: 6,
        name: 'Domestos Çamaşır Suyu 750 Ml',
        brand: 'Domestos',
        category: 'temizlik',
        barcode: '86901234',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 54.90, date: '2026-02-20' },
            { marketId: 'bim', price: 56.50, date: '2026-02-20' },
            { marketId: 'migros', price: 62.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 59.00, date: '2026-02-20' },
            { marketId: 'sok', price: 55.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 42.00 },
            { date: '2025-10-01', market: 'A101', price: 44.50 },
            { date: '2025-11-01', market: 'A101', price: 47.00 },
            { date: '2025-12-01', market: 'A101', price: 50.00 },
            { date: '2026-01-01', market: 'A101', price: 52.50 },
            { date: '2026-02-01', market: 'A101', price: 54.90 }
        ]
    },
    {
        id: 7,
        name: 'Fairy Bulaşık Deterjanı 650 Ml',
        brand: 'Fairy',
        category: 'temizlik',
        barcode: '86901567',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 89.90, date: '2026-02-20' },
            { marketId: 'bim', price: 92.50, date: '2026-02-20' },
            { marketId: 'migros', price: 99.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 94.50, date: '2026-02-20' },
            { marketId: 'sok', price: 91.00, date: '2026-02-20' },
            { marketId: 'metro', price: 88.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 72.00 },
            { date: '2025-10-01', market: 'Metro', price: 75.00 },
            { date: '2025-11-01', market: 'Metro', price: 78.50 },
            { date: '2025-12-01', market: 'Metro', price: 82.00 },
            { date: '2026-01-01', market: 'Metro', price: 85.50 },
            { date: '2026-02-01', market: 'Metro', price: 88.50 }
        ]
    },
    {
        id: 8,
        name: "Lay's Klasik Patates Cipsi 107 G",
        brand: "Lay's",
        category: 'atistirmalik',
        barcode: '86901890',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 34.90, date: '2026-02-20' },
            { marketId: 'bim', price: 36.50, date: '2026-02-20' },
            { marketId: 'migros', price: 39.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 37.50, date: '2026-02-20' },
            { marketId: 'sok', price: 35.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 27.00 },
            { date: '2025-10-01', market: 'A101', price: 28.50 },
            { date: '2025-11-01', market: 'A101', price: 30.00 },
            { date: '2025-12-01', market: 'A101', price: 32.00 },
            { date: '2026-01-01', market: 'A101', price: 33.50 },
            { date: '2026-02-01', market: 'A101', price: 34.90 }
        ]
    },
    {
        id: 9,
        name: 'Nescafe Gold 200 G',
        brand: 'Nescafé',
        category: 'icecek',
        barcode: '86902123',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 289.00, date: '2026-02-20' },
            { marketId: 'bim', price: 295.00, date: '2026-02-20' },
            { marketId: 'migros', price: 319.00, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 309.00, date: '2026-02-20' },
            { marketId: 'sok', price: 292.00, date: '2026-02-20' },
            { marketId: 'metro', price: 285.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 235.00 },
            { date: '2025-10-01', market: 'Metro', price: 245.00 },
            { date: '2025-11-01', market: 'Metro', price: 255.00 },
            { date: '2025-12-01', market: 'Metro', price: 265.00 },
            { date: '2026-01-01', market: 'Metro', price: 275.00 },
            { date: '2026-02-01', market: 'Metro', price: 285.00 }
        ]
    },
    {
        id: 10,
        name: 'Head & Shoulders Şampuan 400 Ml',
        brand: 'Head & Shoulders',
        category: 'kisisel-bakim',
        barcode: '86902456',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 159.00, date: '2026-02-20' },
            { marketId: 'bim', price: 164.90, date: '2026-02-20' },
            { marketId: 'migros', price: 179.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 169.00, date: '2026-02-20' },
            { marketId: 'sok', price: 162.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 129.00 },
            { date: '2025-10-01', market: 'A101', price: 135.00 },
            { date: '2025-11-01', market: 'A101', price: 140.00 },
            { date: '2025-12-01', market: 'A101', price: 147.00 },
            { date: '2026-01-01', market: 'A101', price: 153.00 },
            { date: '2026-02-01', market: 'A101', price: 159.00 }
        ]
    },
    {
        id: 11,
        name: 'Eti Burçak 131 G',
        brand: 'Eti',
        category: 'atistirmalik',
        barcode: '86902789',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 14.50, date: '2026-02-20' },
            { marketId: 'bim', price: 14.90, date: '2026-02-20' },
            { marketId: 'migros', price: 17.50, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 15.90, date: '2026-02-20' },
            { marketId: 'sok', price: 14.75, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'BİM', price: 11.00 },
            { date: '2025-10-01', market: 'BİM', price: 11.50 },
            { date: '2025-11-01', market: 'BİM', price: 12.50 },
            { date: '2025-12-01', market: 'BİM', price: 13.00 },
            { date: '2026-01-01', market: 'BİM', price: 14.00 },
            { date: '2026-02-01', market: 'BİM', price: 14.90 }
        ]
    },
    {
        id: 12,
        name: 'Erikli Su 1.5 L',
        brand: 'Erikli',
        category: 'icecek',
        barcode: '86903012',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 9.90, date: '2026-02-20' },
            { marketId: 'bim', price: 10.50, date: '2026-02-20' },
            { marketId: 'migros', price: 12.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 11.50, date: '2026-02-20' },
            { marketId: 'sok', price: 10.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 7.50 },
            { date: '2025-10-01', market: 'A101', price: 7.90 },
            { date: '2025-11-01', market: 'A101', price: 8.50 },
            { date: '2025-12-01', market: 'A101', price: 9.00 },
            { date: '2026-01-01', market: 'A101', price: 9.50 },
            { date: '2026-02-01', market: 'A101', price: 9.90 }
        ]
    },
    {
        id: 13,
        name: 'Barilla Spagetti 500 G',
        brand: 'Barilla',
        category: 'temel-gida',
        barcode: '86903345',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 39.90, date: '2026-02-20' },
            { marketId: 'bim', price: 41.50, date: '2026-02-20' },
            { marketId: 'migros', price: 45.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 42.50, date: '2026-02-20' },
            { marketId: 'sok', price: 40.50, date: '2026-02-20' },
            { marketId: 'metro', price: 38.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 30.00 },
            { date: '2025-10-01', market: 'Metro', price: 31.50 },
            { date: '2025-11-01', market: 'Metro', price: 33.00 },
            { date: '2025-12-01', market: 'Metro', price: 35.00 },
            { date: '2026-01-01', market: 'Metro', price: 37.00 },
            { date: '2026-02-01', market: 'Metro', price: 38.50 }
        ]
    },
    {
        id: 14,
        name: 'Yudum Ayçiçek Yağı 2 L',
        brand: 'Yudum',
        category: 'temel-gida',
        barcode: '86903678',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 134.90, date: '2026-02-20' },
            { marketId: 'bim', price: 139.00, date: '2026-02-20' },
            { marketId: 'migros', price: 149.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 142.50, date: '2026-02-20' },
            { marketId: 'sok', price: 136.50, date: '2026-02-20' },
            { marketId: 'metro', price: 132.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 109.00 },
            { date: '2025-10-01', market: 'Metro', price: 112.00 },
            { date: '2025-11-01', market: 'Metro', price: 118.00 },
            { date: '2025-12-01', market: 'Metro', price: 122.00 },
            { date: '2026-01-01', market: 'Metro', price: 127.00 },
            { date: '2026-02-01', market: 'Metro', price: 132.00 }
        ]
    },
    {
        id: 15,
        name: 'Colgate Diş Macunu 75 Ml',
        brand: 'Colgate',
        category: 'kisisel-bakim',
        barcode: '86904011',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 49.90, date: '2026-02-20' },
            { marketId: 'bim', price: 52.50, date: '2026-02-20' },
            { marketId: 'migros', price: 57.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 54.50, date: '2026-02-20' },
            { marketId: 'sok', price: 51.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 38.00 },
            { date: '2025-10-01', market: 'A101', price: 40.00 },
            { date: '2025-11-01', market: 'A101', price: 42.50 },
            { date: '2025-12-01', market: 'A101', price: 45.00 },
            { date: '2026-01-01', market: 'A101', price: 47.50 },
            { date: '2026-02-01', market: 'A101', price: 49.90 }
        ]
    },
    {
        id: 16,
        name: 'Fanta Portakal 1 L',
        brand: 'Fanta',
        category: 'icecek',
        barcode: '86904344',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 38.90, date: '2026-02-20' },
            { marketId: 'bim', price: 40.50, date: '2026-02-20' },
            { marketId: 'migros', price: 44.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 42.00, date: '2026-02-20' },
            { marketId: 'sok', price: 39.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 30.00 },
            { date: '2025-10-01', market: 'A101', price: 32.00 },
            { date: '2025-11-01', market: 'A101', price: 34.00 },
            { date: '2025-12-01', market: 'A101', price: 35.50 },
            { date: '2026-01-01', market: 'A101', price: 37.00 },
            { date: '2026-02-01', market: 'A101', price: 38.90 }
        ]
    },
    {
        id: 17,
        name: 'Bingo Toz Deterjan 4 Kg',
        brand: 'Bingo',
        category: 'temizlik',
        barcode: '86904677',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 179.90, date: '2026-02-20' },
            { marketId: 'bim', price: 184.50, date: '2026-02-20' },
            { marketId: 'migros', price: 199.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 189.00, date: '2026-02-20' },
            { marketId: 'sok', price: 182.50, date: '2026-02-20' },
            { marketId: 'metro', price: 175.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 145.00 },
            { date: '2025-10-01', market: 'Metro', price: 150.00 },
            { date: '2025-11-01', market: 'Metro', price: 155.00 },
            { date: '2025-12-01', market: 'Metro', price: 162.00 },
            { date: '2026-01-01', market: 'Metro', price: 169.00 },
            { date: '2026-02-01', market: 'Metro', price: 175.00 }
        ]
    },
    {
        id: 18,
        name: 'Doritos Taco 113 G',
        brand: 'Doritos',
        category: 'atistirmalik',
        barcode: '86905010',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 36.90, date: '2026-02-20' },
            { marketId: 'bim', price: 38.50, date: '2026-02-20' },
            { marketId: 'migros', price: 42.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 39.90, date: '2026-02-20' },
            { marketId: 'sok', price: 37.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 28.00 },
            { date: '2025-10-01', market: 'A101', price: 29.50 },
            { date: '2025-11-01', market: 'A101', price: 31.00 },
            { date: '2025-12-01', market: 'A101', price: 33.00 },
            { date: '2026-01-01', market: 'A101', price: 35.00 },
            { date: '2026-02-01', market: 'A101', price: 36.90 }
        ]
    },
    {
        id: 19,
        name: 'Knorr Mercimek Çorbası 76 G',
        brand: 'Knorr',
        category: 'temel-gida',
        barcode: '86905343',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 19.90, date: '2026-02-20' },
            { marketId: 'bim', price: 20.50, date: '2026-02-20' },
            { marketId: 'migros', price: 24.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 22.50, date: '2026-02-20' },
            { marketId: 'sok', price: 20.00, date: '2026-02-20' },
            { marketId: 'metro', price: 19.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 14.50 },
            { date: '2025-10-01', market: 'Metro', price: 15.00 },
            { date: '2025-11-01', market: 'Metro', price: 16.00 },
            { date: '2025-12-01', market: 'Metro', price: 17.00 },
            { date: '2026-01-01', market: 'Metro', price: 18.50 },
            { date: '2026-02-01', market: 'Metro', price: 19.50 }
        ]
    },
    {
        id: 20,
        name: 'Algida Magnum Classic 100 Ml',
        brand: 'Algida',
        category: 'dondurulmus',
        barcode: '86905676',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 42.90, date: '2026-02-20' },
            { marketId: 'bim', price: 44.50, date: '2026-02-20' },
            { marketId: 'migros', price: 49.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 46.50, date: '2026-02-20' },
            { marketId: 'sok', price: 43.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 34.00 },
            { date: '2025-10-01', market: 'A101', price: 35.50 },
            { date: '2025-11-01', market: 'A101', price: 37.00 },
            { date: '2025-12-01', market: 'A101', price: 39.00 },
            { date: '2026-01-01', market: 'A101', price: 41.00 },
            { date: '2026-02-01', market: 'A101', price: 42.90 }
        ]
    },
    {
        id: 21,
        name: 'İçim Beyaz Peynir 600 G',
        brand: 'İçim',
        category: 'sut-urunleri',
        barcode: '86906009',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 119.90, date: '2026-02-20' },
            { marketId: 'bim', price: 124.50, date: '2026-02-20' },
            { marketId: 'migros', price: 134.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 129.00, date: '2026-02-20' },
            { marketId: 'sok', price: 122.00, date: '2026-02-20' },
            { marketId: 'metro', price: 117.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 95.00 },
            { date: '2025-10-01', market: 'Metro', price: 99.00 },
            { date: '2025-11-01', market: 'Metro', price: 103.00 },
            { date: '2025-12-01', market: 'Metro', price: 108.00 },
            { date: '2026-01-01', market: 'Metro', price: 113.00 },
            { date: '2026-02-01', market: 'Metro', price: 117.50 }
        ]
    },
    {
        id: 22,
        name: 'Lipton Çay 1000 G',
        brand: 'Lipton',
        category: 'icecek',
        barcode: '86906342',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 179.90, date: '2026-02-20' },
            { marketId: 'bim', price: 184.00, date: '2026-02-20' },
            { marketId: 'migros', price: 199.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 189.50, date: '2026-02-20' },
            { marketId: 'sok', price: 182.00, date: '2026-02-20' },
            { marketId: 'metro', price: 176.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 145.00 },
            { date: '2025-10-01', market: 'Metro', price: 149.00 },
            { date: '2025-11-01', market: 'Metro', price: 155.00 },
            { date: '2025-12-01', market: 'Metro', price: 162.00 },
            { date: '2026-01-01', market: 'Metro', price: 170.00 },
            { date: '2026-02-01', market: 'Metro', price: 176.50 }
        ]
    },
    {
        id: 23,
        name: 'Dalan Sıvı Sabun 400 Ml',
        brand: 'Dalan',
        category: 'kisisel-bakim',
        barcode: '86906675',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 44.90, date: '2026-02-20' },
            { marketId: 'bim', price: 46.50, date: '2026-02-20' },
            { marketId: 'migros', price: 52.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 48.50, date: '2026-02-20' },
            { marketId: 'sok', price: 45.50, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'A101', price: 34.00 },
            { date: '2025-10-01', market: 'A101', price: 36.00 },
            { date: '2025-11-01', market: 'A101', price: 38.00 },
            { date: '2025-12-01', market: 'A101', price: 40.00 },
            { date: '2026-01-01', market: 'A101', price: 42.50 },
            { date: '2026-02-01', market: 'A101', price: 44.90 }
        ]
    },
    {
        id: 24,
        name: 'Reis Pilavlık Pirinç 1 Kg',
        brand: 'Reis',
        category: 'temel-gida',
        barcode: '86907008',
        get image() { return makeProductImage(this.name, this.category); },
        prices: [
            { marketId: 'a101', price: 79.90, date: '2026-02-20' },
            { marketId: 'bim', price: 82.50, date: '2026-02-20' },
            { marketId: 'migros', price: 89.90, date: '2026-02-20' },
            { marketId: 'carrefoursa', price: 84.50, date: '2026-02-20' },
            { marketId: 'sok', price: 81.00, date: '2026-02-20' },
            { marketId: 'metro', price: 78.00, date: '2026-02-20' }
        ],
        priceHistory: [
            { date: '2025-09-01', market: 'Metro', price: 62.00 },
            { date: '2025-10-01', market: 'Metro', price: 64.00 },
            { date: '2025-11-01', market: 'Metro', price: 67.00 },
            { date: '2025-12-01', market: 'Metro', price: 71.00 },
            { date: '2026-01-01', market: 'Metro', price: 75.00 },
            { date: '2026-02-01', market: 'Metro', price: 78.00 }
        ]
    }
];
