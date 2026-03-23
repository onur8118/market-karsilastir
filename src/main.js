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
    limit: 30,
    total: 0,
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
async function loadProducts(resetToPage1 = false) {
    if (resetToPage1) {
        state.page = 1;
    }

    state.loading = true;
    const loadingEl = document.getElementById('loading');
    const grid = document.getElementById('productGrid');

    if (loadingEl) loadingEl.style.display = 'flex';
    grid.innerHTML = ''; // Clear for new page load
    document.getElementById('paginationContainer').innerHTML = ''; // Hide pagination during load

    try {
        const query = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            q: state.searchQuery,
            category: state.activeCategory === 'hepsi' ? '' : state.activeCategory,
            sort: state.sortBy
        });
        if (state.activeMarket) query.append('market', state.activeMarket);

        const data = await fetchAPI(`/products?${query.toString()}`);

        if (data && data.products) {
            state.products = data.products;
            state.total = data.pagination.total;

            renderProducts(data.products, true);
            updateResultsInfo();
            renderPagination();

            // Smooth scroll to top of grid
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (err) {
        console.error('Fetch error:', err);
    } finally {
        state.loading = false;
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
            <div class="product-card" onclick="window.location.href = '/product.html?id=${product.id}'">
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

    // Search
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            loadProducts(true);
            const url = new URL(window.location);
            if (state.searchQuery) url.searchParams.set('q', state.searchQuery);
            else url.searchParams.delete('q');
            window.history.replaceState({}, '', url);
        }, 500);
    });

    // Sidebar Category clicks
    document.querySelectorAll('[data-category]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const cat = item.getAttribute('data-category');

            // Update UI
            document.querySelectorAll('[data-category]').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update State
            state.activeCategory = cat;
            loadProducts(true);
        });
    });

    // Sorting
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            loadProducts(true);
        });
    }
}

window.goToPage = (page) => {
    state.page = page;
    loadProducts(false);
};

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const totalPages = Math.ceil(state.total / state.limit);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Prev Button
    html += `<button class="page-btn" ${state.page === 1 ? 'disabled' : `onclick="goToPage(${state.page - 1})"`}>Önceki</button>`;

    // Page Numbers (Show max 5 pages around current)
    let startPage = Math.max(1, state.page - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span style="color: var(--text-muted); padding: 0 5px;">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === state.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span style="color: var(--text-muted); padding: 0 5px;">...</span>`;
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Next Button
    html += `<button class="page-btn" ${state.page === totalPages ? 'disabled' : `onclick="goToPage(${state.page + 1})"`}>Sonraki</button>`;

    container.innerHTML = html;
}

function renderMarketDropdown() {
    const container = document.getElementById('marketFilters');
    if (!container) return;

    // Inline SVG logos — no external dependency, always works
    const mkSvg = (letter, bg, fg = 'white') =>
        `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><rect width='28' height='28' rx='6' fill='${encodeURIComponent(bg)}'/><text x='14' y='20' text-anchor='middle' font-size='14' font-weight='900' font-family='Arial,sans-serif' fill='${fg}'>${letter}</text></svg>`;

    const MARKET_LOGOS = {
        a101: 'https://marketkarsilastir.com/uploads/markets/a101.png',
        sok: 'https://marketkarsilastir.com/uploads/markets/sok.png',
        migros: 'https://marketkarsilastir.com/uploads/markets/migros.png',
        carrefoursa: 'https://marketkarsilastir.com/uploads/markets/carrefour.png',
        metro: 'https://marketkarsilastir.com/uploads/markets/metro.png',
        bizim: 'https://marketkarsilastir.com/uploads/markets/bizimToptan.png',
        file: 'https://marketkarsilastir.com/uploads/markets/file.png',
        mopas: 'https://marketkarsilastir.com/uploads/markets/mopas.png',
        onur: mkSvg('O', '#f26522'),
    };

    container.innerHTML = `
        <div class="sidebar-item ${!state.activeMarket ? 'active' : ''}" data-market="">
            <span class="market-dot" style="background: #ccc"></span>
            Tüm Marketler
        </div>
        ${state.markets.map(m => {
        const logoUrl = MARKET_LOGOS[m.id];
        return `
            <div class="sidebar-item ${state.activeMarket == m.id ? 'active' : ''}" data-market="${m.id}">
                ${logoUrl ? `<img class="market-logo-small" src="${logoUrl}" alt="${m.name}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">
                <span class="market-dot" style="background: ${m.color}; display:none"></span>`
                : `<span class="market-dot" style="background: ${m.color}"></span>`}
                ${m.name}
            </div>`;
    }).join('')}
    `;

    // Add listeners to new elements
    container.querySelectorAll('[data-market]').forEach(item => {
        item.addEventListener('click', () => {
            const marketId = item.getAttribute('data-market');
            state.activeMarket = marketId || null;

            // Update UI
            container.querySelectorAll('[data-market]').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            loadProducts(true);
        });
    });

    // Get product count and update stat
    fetchAPI('/stats').then(stats => {
        const el = document.getElementById('statProductCount');
        if (el && stats.totalProducts) {
            el.textContent = stats.totalProducts.toLocaleString() + '+';
        }
    });
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
