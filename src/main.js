import './style.css';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const API_BASE = 'http://localhost:3005/api';

// ============================================
// STATE
// ============================================
const state = {
    searchQuery: '',
    activeCategory: 'hepsi',
    activeMarket: null,
    sortBy: 'default',
    chart: null,
    products: [],
    markets: [],
    loading: false,
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true,
    loadingMore: false,
    cart: JSON.parse(localStorage.getItem('fiyatradar_cart') || '[]'),
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('category')) state.activeCategory = params.get('category');
    if (params.has('market')) state.activeMarket = params.get('market');
    if (params.has('q')) state.searchQuery = params.get('q');

    setupEventListeners();
    updateCartBadge();
    await loadInitialData();
});

async function loadInitialData() {
    state.loading = true;
    renderSkeleton();

    try {
        const [marketsData] = await Promise.allSettled([fetchAPI('/markets')]);
        state.markets = marketsData.status === 'fulfilled' ? marketsData.value : [];

        renderMarketDropdown();
        await loadProducts(true);
        setupInfiniteScroll();
    } catch (err) {
        console.warn('Init error:', err);
        await loadProducts(true);
    } finally {
        state.loading = false;
    }
}

// ============================================
// CART LOGIC
// ============================================
function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.textContent = state.cart.length;
        badge.style.display = state.cart.length > 0 ? 'inline-block' : 'none';
    }
}

window.addToCart = (productId, event) => {
    if (event) event.stopPropagation();

    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const prices = product.prices || [];
    const minPrice = prices.length ? Math.min(...prices.map(p => p.price)) : 0;
    const bestMarket = prices.find(p => p.price === minPrice) || {};

    const cartItem = {
        id: product.id,
        name: product.name,
        brand: product.brand,
        image: getProductImage(product),
        price: minPrice,
        market: bestMarket.marketName || bestMarket.marketId,
        marketColor: bestMarket.marketColor,
        dateAdded: new Date().toISOString()
    };

    state.cart.push(cartItem);
    localStorage.setItem('fiyatradar_cart', JSON.stringify(state.cart));
    updateCartBadge();
    showToast(`${product.name} sepete eklendi! 🛒`);
};

function getProductImage(product) {
    if (product.image_url) return product.image_url;
    if (product.barcode) return `https://marketkarsilastir.com/urunler/${product.barcode}.jpg`;
    return '/placeholder.png';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: var(--secondary); color: white; padding: 12px 24px;
        border-radius: 50px; font-weight: 700; z-index: 9999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: fadeInUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOutDown 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

window.addEventListener('storage', (e) => {
    if (e.key === 'fiyatradar_cart') {
        state.cart = JSON.parse(e.newValue || '[]');
        updateCartBadge();
    }
});

// ============================================
// PRODUCT FETCHING & RENDERING
// ============================================
async function loadProducts(reset = false) {
    if (reset) {
        state.page = 1;
        state.products = [];
        state.hasMore = true;
        document.getElementById('productGrid').innerHTML = '';
    }

    if (!state.hasMore || state.loadingMore) return;
    state.loadingMore = true;
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
        const query = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            q: state.searchQuery,
            category: state.activeCategory
        });
        if (state.activeMarket) query.append('market', state.activeMarket);

        const data = await fetchAPI(`/products?${query.toString()}`);

        if (data && data.products) {
            state.products = [...state.products, ...data.products];
            state.total = data.pagination.total;
            state.hasMore = data.pagination.hasMore;
            state.page++;

            renderProducts(data.products, reset);
            updateResultsInfo();
        }
    } catch (err) {
        console.error('Fetch error:', err);
    } finally {
        state.loadingMore = false;
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function updateResultsInfo() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) resultsCount.textContent = `${state.total} ürün listeleniyor`;
}

function renderProducts(newProducts = [], reset = false) {
    const grid = document.getElementById('productGrid');

    const html = newProducts.map((product) => {
        const prices = product.prices || [];
        const minPrice = prices.length ? Math.min(...prices.map(p => p.price)) : 0;
        const marketCount = prices.length;
        const imgSrc = getProductImage(product);

        return `
            <div class="product-card" onclick="window.open('/product.html?id=${product.id}', '_blank')">
                <div class="card-image">
                    <img src="${imgSrc}" alt="${product.name}" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='/placeholder.png';">
                </div>
                <div class="card-name">${product.name}</div>
                <div class="card-market-count">${marketCount} Markette Mevcut</div>
                
                <div class="card-price-main">
                    <span class="card-price-value">${formatPrice(minPrice)} ₺</span>
                    <span style="font-size: 9px; background: #E6F6FF; color: #0088CC; padding: 2px 6px; border-radius: 4px; font-weight: 800;">EN UCUZ</span>
                </div>
                
                <button class="add-to-cart-btn" onclick="addToCart(${product.id}, event)">
                    Sepete Ekle 🛒
                </button>
            </div>
        `;
    }).join('');

    if (reset) grid.innerHTML = html;
    else grid.insertAdjacentHTML('beforeend', html);
}

// ============================================
// EVENTS
// ============================================
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (state.searchQuery) searchInput.value = state.searchQuery;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            loadProducts(true);
            const url = new URL(window.location);
            if (state.searchQuery) url.searchParams.set('q', state.searchQuery);
            else url.searchParams.delete('q');
            window.history.replaceState({}, '', url);
        }, 3000); // Debounce set to 3s for user preference or performance
    });
}

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && state.hasMore && !state.loadingMore) loadProducts();
    }, { threshold: 0.1 });
    const scrollEnd = document.getElementById('scrollEnd');
    if (scrollEnd) observer.observe(scrollEnd);
}

function renderMarketDropdown() {
    const container = document.getElementById('marketFilters');
    if (!container) return;

    container.innerHTML = `
        <a href="/?market=" class="dropdown-item">Tüm Marketler</a>
        ${state.markets.map(m => `
            <a href="/?market=${m.id}" target="_blank" class="dropdown-item">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${m.color}; display: inline-block; margin-right: 8px;"></span>
                ${m.name}
            </a>
        `).join('')}
    `;
}

function renderSkeleton() {
    document.getElementById('productGrid').innerHTML = Array(8).fill(0).map(() => `<div class="product-card" style="opacity: 0.4; height: 350px; background: #EEE;"></div>`).join('');
}

function formatPrice(price) { return (price || 0).toFixed(2).replace('.', ','); }
async function fetchAPI(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(res.status);
    return res.json();
}
