import './style.css';

const state = {
    cart: JSON.parse(localStorage.getItem('fiyatradar_cart') || '[]'),
};

document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'fiyatradar_cart') {
            state.cart = JSON.parse(e.newValue || '[]');
            renderCart();
        }
    });
});

function renderCart() {
    const list = document.getElementById('cartItems');
    const empty = document.getElementById('emptyCart');
    const grid = document.getElementById('cartGrid');

    if (!state.cart || state.cart.length === 0) {
        if (grid) grid.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (grid) grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    list.innerHTML = state.cart.map((item, index) => `
        <div class="cart-item-row">
            <div class="cart-item-visual">
                <img src="${item.image || '/placeholder.png'}" 
                     alt="${item.name}" 
                     class="cart-item-thumb" 
                     onerror="this.onerror=null; this.src='/placeholder.png';">
            </div>
            
            <div class="cart-item-info">
                <span>${item.brand || 'DİĞER'}</span>
                <h4>${item.name}</h4>
            </div>

            <div class="cart-item-market">
                <span class="market-dot" style="background: ${item.marketColor || '#888'}"></span>
                <span>${item.market || 'Bilinmiyor'}</span>
            </div>

            <div class="cart-item-price">
                ${formatPrice(item.price)} ₺
            </div>

            <div class="cart-item-actions">
                <button class="cart-remove-btn" onclick="removeFromCart(${index})" title="Listeden Kaldır">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    updateSummary();
}

function updateSummary() {
    const totalItems = document.getElementById('totalItems');
    const grandTotal = document.getElementById('grandTotal');
    const marketBreakdown = document.getElementById('marketBreakdown');

    const total = state.cart.reduce((sum, item) => sum + item.price, 0);
    if (totalItems) totalItems.textContent = `${state.cart.length} Adet`;
    if (grandTotal) grandTotal.textContent = `${formatPrice(total)} ₺`;

    // Calculate per-market totals (If we want to show comparison, but current cart only stores the selected market price)
    // For now, we show the summary of what's actually in the cart
    const totalsByMarket = {};
    state.cart.forEach(item => {
        const m = item.market || 'Diğer';
        if (!totalsByMarket[m]) {
            totalsByMarket[m] = { total: 0, count: 0, color: item.marketColor || '#888' };
        }
        totalsByMarket[m].total += item.price;
        totalsByMarket[m].count += 1;
    });

    if (marketBreakdown) {
        const sortedMarkets = Object.keys(totalsByMarket).sort((a, b) => totalsByMarket[a].total - totalsByMarket[b].total);
        marketBreakdown.innerHTML = sortedMarkets.map((m, idx) => `
            <div class="market-item ${idx === 0 && sortedMarkets.length > 1 ? 'best' : ''}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="market-dot" style="background: ${totalsByMarket[m].color}"></span>
                    <div style="font-weight: 700; font-size: 13px;">${m} <span style="font-weight: 500; font-size: 11px; opacity: 0.6;">(${totalsByMarket[m].count} Ürün)</span></div>
                </div>
                <div style="font-weight: 800; color: var(--secondary);">${formatPrice(totalsByMarket[m].total)} ₺</div>
            </div>
        `).join('');
    }
}

window.removeFromCart = (index) => {
    state.cart.splice(index, 1);
    localStorage.setItem('fiyatradar_cart', JSON.stringify(state.cart));
    renderCart();
};

window.clearCart = () => {
    if (confirm('Tüm listeyi temizlemek istediğinize emin misiniz?')) {
        state.cart = [];
        localStorage.setItem('fiyatradar_cart', JSON.stringify(state.cart));
        renderCart();
    }
};

function formatPrice(price) {
    return (price || 0).toFixed(2).replace('.', ',');
}
