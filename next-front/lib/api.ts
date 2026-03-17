const BASE_URL = "/api";

export async function fetchStats() {
    const res = await fetch(`${BASE_URL}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
}

export async function fetchProducts({
    category = "",
    market = "",
    search = "",
    sort = "price_asc",
    page = 1,
    limit = 24
}) {
    const params = new URLSearchParams({
        q: search,
        category,
        market,
        sort,
        page: page.toString(),
        limit: limit.toString()
    });

    const res = await fetch(`${BASE_URL}/products?${params}`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
}

export async function fetchCategories() {
    const res = await fetch(`${BASE_URL}/categories`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
}

export async function fetchMarkets() {
    const res = await fetch(`${BASE_URL}/markets`);
    if (!res.ok) throw new Error("Failed to fetch markets");
    return res.json();
}

export async function fetchProductDetail(id: number) {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    if (!res.ok) throw new Error("Failed to fetch product detail");
    return res.json();
}

export async function fetchBestTime(id: number) {
    const res = await fetch(`${BASE_URL}/products/${id}/best-time`);
    if (!res.ok) throw new Error("Failed to fetch best time data");
    return res.json();
}

export async function fetchSuggestions(q: string) {
    if (!q || q.length < 2) return [];
    const res = await fetch(`${BASE_URL}/search/suggestions?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    return res.json();
}
