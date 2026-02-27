import './style.css';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const API_BASE = 'http://localhost:3001/api';

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
    categories: [],
    markets: [],
    loading: false,
    // Pagination state
    page: 1,
    limit: 60,
    total: 0,
    hasMore: true,
    loadingMore: false,
};

// ============================================
// SVG Image generation (for products without images)
// ============================================
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
    'bebek': { bg: '#FFF1F2', fg: '#E11D48', emoji: '👶' },
};

function makeProductImage(name, category) {
    const colors = categoryColors[category] || { bg: '#F3F4F6', fg: '#6B7280', emoji: '📦' };
    const displayName = name.length > 24 ? name.substring(0, 22) + '…' : name;
    const escaped = displayName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="16" fill="${colors.bg}"/>
    <text x="100" y="90" text-anchor="middle" font-size="60">${colors.emoji}</text>
    <text x="100" y="135" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="600" fill="${colors.fg}">${escaped}</text>
  </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getProductImage(product) {
    if (product.image_url && product.image_url.startsWith('http')) {
        return product.image_url;
    }
    return makeProductImage(product.name, product.category);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadInitialData();
});

async function loadInitialData() {
    state.loading = true;
    renderSkeleton(); // Add a skeleton loader

    try {
        const [marketsData, categoriesData, statsData] = await Promise.all([
            fetchAPI('/markets'),
            fetchAPI('/categories'),
            fetchAPI('/stats'),
        ]);

        state.markets = marketsData || [];
        state.categories = [{ id: 'hepsi', name: 'Tümü', icon: '🏪' }, ...(categoriesData || [])];

        if (statsData) {
            document.getElementById('statProducts').textContent = statsData.totalProducts || 0;
            document.getElementById('statMarkets').textContent = statsData.totalMarkets || 0;
            document.getElementById('statCategories').textContent = (categoriesData || []).length;
        }

        renderCategories();
        renderMarketFilters();

        // Initial products load
        await loadProducts(true);

        setupInfiniteScroll();

    } catch (err) {
        console.warn('⚠️ API hatası, demo verisi yükleniyor...', err);
        // ... demo data fallback remains same or similar ...
        loadDemoData();
    } finally {
        state.loading = false;
    }
}

async function loadProducts(reset = false) {
    if (reset) {
        state.page = 1;
        state.products = [];
        state.hasMore = true;
        document.getElementById('productsGrid').innerHTML = '';
    }

    if (!state.hasMore || state.loadingMore) return;

    state.loadingMore = true;
    showLoader();

    try {
        const query = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            q: state.searchQuery,
            category: state.activeCategory,
            sort: state.sortBy
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
        console.error('Ürün yükleme hatası:', err);
    } finally {
        state.loadingMore = false;
        hideLoader();
    }
}

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && state.hasMore && !state.loadingMore) {
            loadProducts();
        }
    }, { threshold: 0.1 });

    // Create a sentinel element at the bottom of the grid
    let sentinel = document.getElementById('infinite-scroll-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'infinite-scroll-sentinel';
        sentinel.style.height = '100px';
        sentinel.style.width = '100%';
        document.querySelector('.products-section .container').appendChild(sentinel);
    }
    observer.observe(sentinel);
}

function updateResultsInfo() {
    const resultsCount = document.getElementById('resultsCount');
    resultsCount.textContent = `${state.total} ürün (${state.products.length} yüklendi)`;
}

function showLoader() {
    let loader = document.getElementById('bottom-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'bottom-loader';
        loader.innerHTML = '<div class="spinner"></div><span>Yeni ürünler yükleniyor...</span>';
        document.querySelector('.products-section .container').appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('bottom-loader');
    if (loader) loader.style.display = 'none';
}

function renderSkeleton() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = Array(8).fill(0).map(() => `
        <div class="product-card skeleton">
            <div class="card-image"></div>
            <div class="card-content">
                <div class="skeleton-line" style="width: 40%"></div>
                <div class="skeleton-line" style="width: 80%"></div>
                <div class="skeleton-line" style="width: 60%"></div>
            </div>
        </div>
    `).join('');
}

async function loadDemoData() {
    const { products } = await import('./data/products.js');
    const { categories } = await import('./data/categories.js');
    const { markets } = await import('./data/markets.js');

    state.products = products.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        barcode: p.barcode,
        image_url: p.image,
        prices: p.prices.map(pr => ({
            marketId: pr.marketId,
            marketName: markets.find(m => m.id === pr.marketId)?.name || pr.marketId,
            marketColor: markets.find(m => m.id === pr.marketId)?.color || '#666',
            price: pr.price,
            date: pr.date,
        })),
        priceHistory: p.priceHistory,
    }));
    state.categories = categories;
    state.markets = markets.map(m => ({ id: m.id, name: m.name, color: m.color, bg_color: m.bgColor }));
    state.total = state.products.length;
    state.hasMore = false;

    renderCategories();
    renderMarketFilters();
    renderProducts(state.products, true);
    updateResultsInfo();
}

async function fetchAPI(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            loadProducts(true);
        }, 300);
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape') closeModal();
    });

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    });

    // Sort
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => sortDropdown.classList.remove('open'));
    sortDropdown.querySelectorAll('.sort-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.sortBy = btn.dataset.sort;
            sortDropdown.querySelectorAll('.sort-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sortDropdown.classList.remove('open');
            loadProducts(true);
        });
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

// ============================================
// RENDER CATEGORIES
// ============================================
function renderCategories() {
    const container = document.getElementById('categoryScroll');
    container.innerHTML = state.categories.map(cat => `
    <button class="category-chip ${cat.id === state.activeCategory ? 'active' : ''}" data-category="${cat.id}">
      <span class="chip-icon">${cat.icon}</span>
      ${cat.name}
    </button>
  `).join('');

    container.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            state.activeCategory = chip.dataset.category;
            container.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            loadProducts(true);
        });
    });
}

// ============================================
// RENDER MARKET FILTERS
// ============================================
function renderMarketFilters() {
    const container = document.getElementById('marketFilterBar');

    const allChip = `<button class="market-chip ${!state.activeMarket ? 'active' : ''}" data-market=""
    style="--market-color: var(--accent-primary); --market-bg: rgba(108,99,255,0.06);">
    <span class="market-dot" style="background: var(--accent-primary)"></span>
    Tüm Marketler
  </button>`;

    const marketChips = state.markets.map(m => `
    <button class="market-chip ${state.activeMarket === m.id ? 'active' : ''}"
      data-market="${m.id}"
      style="--market-color: ${m.color}; --market-bg: ${m.bg_color || m.bgColor || 'rgba(0,0,0,0.04)'};">
      <span class="market-dot" style="background: ${m.color}"></span>
      ${m.name}
    </button>
  `).join('');

    container.innerHTML = allChip + marketChips;

    container.querySelectorAll('.market-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            state.activeMarket = chip.dataset.market || null;
            container.querySelectorAll('.market-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            loadProducts(true);
        });
    });
}

// ============================================
// FILTER & SORT
// ============================================
function getFilteredProducts() {
    let filtered = [...state.products];

    if (state.searchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(state.searchQuery) ||
            (p.brand || '').toLowerCase().includes(state.searchQuery) ||
            (p.barcode || '').includes(state.searchQuery)
        );
    }

    if (state.activeCategory !== 'hepsi') {
        filtered = filtered.filter(p => p.category === state.activeCategory);
    }

    if (state.activeMarket) {
        filtered = filtered.filter(p =>
            p.prices.some(pr => pr.marketId === state.activeMarket)
        );
    }

    switch (state.sortBy) {
        case 'price-asc':
            filtered.sort((a, b) => getMinPrice(a) - getMinPrice(b));
            break;
        case 'price-desc':
            filtered.sort((a, b) => getMinPrice(b) - getMinPrice(a));
            break;
        case 'discount':
            filtered.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
            break;
    }

    return filtered;
}

function getMinPrice(product) {
    return Math.min(...product.prices.map(p => p.price));
}

function getMaxPrice(product) {
    return Math.max(...product.prices.map(p => p.price));
}

function getDiscountPercent(product) {
    const min = getMinPrice(product);
    const max = getMaxPrice(product);
    return max > 0 ? ((max - min) / max) * 100 : 0;
}

function getCheapestMarket(product) {
    const min = getMinPrice(product);
    return product.prices.find(p => p.price === min);
}

// ============================================
// RENDER PRODUCTS
// ============================================
function renderProducts(newProducts = [], reset = false) {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');

    if (reset) {
        grid.innerHTML = '';
        if (newProducts.length === 0) {
            grid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }
    }

    noResults.style.display = 'none';
    grid.style.display = 'grid';

    const html = newProducts.map((product, index) => {
        const minPrice = getMinPrice(product);
        const maxPrice = getMaxPrice(product);
        const discount = getDiscountPercent(product);
        const cheapest = getCheapestMarket(product);
        const marketCount = product.prices.length;
        const imgSrc = getProductImage(product);

        const marketTags = product.prices
            .sort((a, b) => a.price - b.price)
            .slice(0, 4)
            .map(p => {
                const isCheapest = p.price === minPrice;
                return `<span class="card-market-tag ${isCheapest ? 'cheapest' : ''}">${p.marketName || p.market_name} ${formatPrice(p.price)}</span>`;
            })
            .join('');

        return `
      <div class="product-card" data-product-id="${product.id}" style="animation-delay: ${Math.min(index * 0.05, 0.4)}s">
        <div class="card-badges">
          ${discount > 5 ? `<span class="badge badge-discount">%${discount.toFixed(1)} Fark</span>` : ''}
          <span class="badge badge-cheapest">En Ucuz: ${cheapest?.marketName || cheapest?.market_name || '?'}</span>
        </div>
        <div class="card-image">
          <img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.src='${makeProductImage(product.name, product.category)}'"/>
        </div>
        <div class="card-content">
          <div class="card-brand">${product.brand || ''}</div>
          <div class="card-name">${product.name}</div>
          <div class="card-price-row">
            <div class="card-price-main">
              <span class="card-price-label">En düşük fiyat</span>
              <span class="card-price-value">${formatPrice(minPrice)} <span class="currency">₺</span></span>
            </div>
            <div class="card-price-range">
              ${maxPrice !== minPrice ? `<span class="card-price-max">${formatPrice(maxPrice)} ₺</span>` : ''}
              <span class="card-market-count">${marketCount} markette</span>
            </div>
          </div>
          <div class="card-markets">${marketTags}</div>
        </div>
      </div>
    `;
    }).join('');

    if (reset) {
        grid.innerHTML = html;
    } else {
        grid.insertAdjacentHTML('beforeend', html);
    }

    grid.querySelectorAll('.product-card').forEach(card => {
        if (!card.hasListener) {
            card.addEventListener('click', () => {
                openModal(card.dataset.productId);
            });
            card.hasListener = true;
        }
    });
}

// ============================================
// MODAL
// ============================================
async function openModal(productId) {
    const overlay = document.getElementById('modalOverlay');

    // Try to get detailed data from API
    let product;
    try {
        product = await fetchAPI(`/products/${productId}`);
        // Ensure image
        if (!product.image_url || !product.image_url.startsWith('http')) {
            product.image_url = makeProductImage(product.name, product.category);
        }
    } catch {
        // Fallback to local state
        product = state.products.find(p => p.id === productId || p.id === parseInt(productId));
        if (!product) return;
    }

    const imgSrc = product.image_url || getProductImage(product);

    document.getElementById('modalImage').src = imgSrc;
    document.getElementById('modalImage').alt = product.name;
    document.getElementById('modalBrand').textContent = product.brand || '';
    document.getElementById('modalName').textContent = product.name;

    const cat = state.categories.find(c => c.id === product.category);
    document.getElementById('modalCategory').textContent = cat ? `${cat.icon} ${cat.name}` : product.category || '';
    document.getElementById('modalBarcode').textContent = product.barcode ? `📦 ${product.barcode}` : '';

    // Prices
    const prices = product.prices || [];
    const minPrice = prices.length ? Math.min(...prices.map(p => p.price)) : 0;
    const sortedPrices = [...prices].sort((a, b) => a.price - b.price);

    const priceList = document.getElementById('priceComparisonList');
    priceList.innerHTML = sortedPrices.map(p => {
        const isCheapest = p.price === minPrice;
        const diff = p.price - minPrice;
        const color = p.marketColor || state.markets.find(m => m.id === p.marketId)?.color || '#666';

        return `
      <div class="price-row ${isCheapest ? 'cheapest' : ''}">
        <div class="price-row-left">
          <span class="price-market-dot" style="background: ${color}"></span>
          <span class="price-market-name">${p.marketName || p.market_name || ''}</span>
          <div class="price-row-badges">
            ${isCheapest ? '<span class="price-badge">En Ucuz</span>' : ''}
          </div>
        </div>
        <div class="price-row-right">
          <span class="price-value">${formatPrice(p.price)} ₺</span>
          ${!isCheapest && diff > 0 ? `<span class="price-diff">+${formatPrice(diff)} ₺</span>` : ''}
        </div>
      </div>
    `;
    }).join('');

    // Chart
    renderPriceChart(product);

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
    if (state.chart) { state.chart.destroy(); state.chart = null; }
}

// ============================================
// CHART
// ============================================
function renderPriceChart(product) {
    if (state.chart) state.chart.destroy();

    const ctx = document.getElementById('priceChart').getContext('2d');
    const history = product.priceHistory || [];

    if (history.length === 0) {
        // No history — show message
        state.chart = new Chart(ctx, {
            type: 'line',
            data: { labels: ['Veri yok'], datasets: [{ data: [0] }] },
            options: { plugins: { legend: { display: false } } }
        });
        return;
    }

    const labels = history.map(h => {
        const date = new Date(h.date);
        return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    });
    const data = history.map(h => h.price);

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(108, 99, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(108, 99, 255, 0.02)');

    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Fiyat (₺)',
                data,
                borderColor: '#6C63FF',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointBackgroundColor: '#6C63FF',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1a2e',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: { label: (ctx) => `${formatPrice(ctx.parsed.y)} ₺` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#718096' } },
                y: { grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false }, ticks: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#718096', callback: v => `${v} ₺` } }
            }
        }
    });
}

// ============================================
// UTILS
// ============================================
function formatPrice(price) {
    return price.toFixed(2).replace('.', ',');
}
