import './style.css';

const API_BASE = 'http://localhost:3005/api';
const productId = new URLSearchParams(window.location.search).get('id');

const state = {
    product: null,
    cart: JSON.parse(localStorage.getItem('fiyatradar_cart') || '[]'),
};

const NON_FOOD_CATEGORIES = ['temizlik', 'kisisel-bakim'];

document.addEventListener('DOMContentLoaded', async () => {
    if (!productId) {
        window.location.href = '/';
        return;
    }
    await loadProductDetail();
});

async function loadProductDetail() {
    try {
        const res = await fetch(`${API_BASE}/products/${productId}`);
        if (!res.ok) throw new Error('Ürün bulunamadı');

        state.product = await res.json();
        renderDetail();
    } catch (err) {
        console.error(err);
        document.getElementById('productDetail').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 100px;">
                <h2 style="font-size: 32px; color: var(--secondary);">Hata: Ürün Bulunamadı</h2>
                <a href="/" class="back-btn-premium" style="margin-top: 20px;">Ana Sayfaya Dön</a>
            </div>
        `;
    }
}

function renderDetail() {
    const p = state.product;

    // Header Logo link fix
    document.querySelectorAll('.navbar-brand').forEach(el => el.href = '/');

    // Badges
    document.getElementById('detailCategory').textContent = `🏷️ ${p.category || 'Genel'}`;
    document.getElementById('detailBrand').textContent = `🏢 ${p.brand || 'DİĞER'}`;

    // Basic Info
    document.getElementById('detailTitle').textContent = p.name;
    document.getElementById('detailBarcode').textContent = p.barcode || '8690000000000';

    // Image
    const imgBox = document.getElementById('detailImage');
    const imgSrc = getProductImage(p);
    imgBox.innerHTML = `
        <img src="${imgSrc}" alt="${p.name}" 
             onerror="this.onerror=null; this.src='/placeholder.png';">
    `;

    // Prices
    const priceList = document.getElementById('marketPrices');
    if (p.prices && p.prices.length > 0) {
        priceList.innerHTML = p.prices.map(price => `
            <div class="market-row-premium">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${price.marketColor}"></div>
                    <div>
                        <div style="font-weight: 800; color: var(--secondary); font-size: 18px;">${price.marketName}</div>
                        <div style="font-size: 11px; color: var(--text-light); text-transform: uppercase; font-weight: 700;">
                            Son Güncelleme: ${new Date(price.date).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 26px; font-weight: 800; color: var(--secondary); letter-spacing: -0.5px;">${formatPrice(price.price)} ₺</div>
                    ${price.originalPrice ? `<div style="text-decoration: line-through; color: var(--text-muted); font-size: 14px; opacity: 0.6;">${formatPrice(price.originalPrice)} ₺</div>` : ''}
                </div>
            </div>
        `).join('');

        const minPrice = Math.min(...p.prices.map(pr => pr.price));
        document.getElementById('cheapestPrice').textContent = `${formatPrice(minPrice)} ₺`;
    } else {
        priceList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px; font-weight: 500;">Fiyat bilgisi şu an ulaşılamıyor.</p>';
    }

    // Nutrition visibility & Toggle
    const nutritionSection = document.getElementById('nutritionSection');
    if (NON_FOOD_CATEGORIES.includes(p.category)) {
        nutritionSection.style.display = 'none';
    } else {
        nutritionSection.style.display = 'block';
        document.getElementById('valEnergy').textContent = p.nutrition_energy || '-';
        document.getElementById('valCarbs').textContent = p.nutrition_carbs || '-';
        document.getElementById('valProtein').textContent = p.nutrition_protein || '-';
        document.getElementById('valFat').textContent = p.nutrition_fat || '-';

        const ingredients = document.getElementById('detailIngredients');
        ingredients.textContent = p.ingredients || 'Bu ürün için içerik bilgisi henüz eklenmemiştir.';

        // Nutrition Toggle Logic
        const toggleBtn = document.getElementById('toggleNutrition');
        const drawer = document.getElementById('nutritionDrawer');

        toggleBtn.onclick = () => {
            const isOpen = drawer.style.display === 'flex';
            drawer.style.display = isOpen ? 'none' : 'flex';
            toggleBtn.innerHTML = isOpen ? 'Besin Değerleri için Tıklayınız 🖱️' : 'Bilgileri Gizle ⬆️';
            toggleBtn.style.background = isOpen ? '#FDFDFD' : 'rgba(255, 215, 0, 0.2)';
        }
    }

    // Add to Cart Action
    document.getElementById('addToCartDetail').onclick = () => {
        addToCart(p);
    };
}

function getProductImage(product) {
    if (product.image_url) return product.image_url;
    if (product.barcode) return `https://marketkarsilastir.com/urunler/${product.barcode}.jpg`;
    return '/placeholder.png';
}

function addToCart(p) {
    const minPrice = p.prices && p.prices.length ? Math.min(...p.prices.map(pr => pr.price)) : 0;
    const bestMarket = (p.prices || []).find(pr => pr.price === minPrice) || {};

    const cartItem = {
        id: p.id,
        name: p.name,
        brand: p.brand,
        image: getProductImage(p),
        price: minPrice,
        market: bestMarket.marketName || bestMarket.marketId,
        marketColor: bestMarket.marketColor,
        dateAdded: new Date().toISOString()
    };

    const cart = JSON.parse(localStorage.getItem('fiyatradar_cart') || '[]');
    cart.push(cartItem);
    localStorage.setItem('fiyatradar_cart', JSON.stringify(cart));

    showToast(`${p.name} alışveriş listesine eklendi! ✨`);
}

function formatPrice(price) { return (price || 0).toFixed(2).replace('.', ','); }

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: var(--secondary); color: white; padding: 14px 40px;
        border-radius: 50px; font-weight: 700; z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: fadeInUp 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
