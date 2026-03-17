"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { fetchProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "framer-motion";

interface ProductGridProps {
    search: string;
    category: string;
    market: string;
    onProductClick: (id: number) => void;
}

const ProductSkeleton = () => (
    <div style={{
        background: "var(--bg-secondary)",
        borderRadius: "20px",
        padding: "0",
        overflow: "hidden",
        border: "1px solid var(--border-light)"
    }}>
        <div style={{
            aspectRatio: "1",
            background: "var(--bg-tertiary)",
            animation: "pulse 2s infinite"
        }} />
        <div style={{ padding: "1.25rem" }}>
            <div style={{ height: "10px", width: "40%", background: "var(--bg-tertiary)", borderRadius: "99px", marginBottom: "8px" }} />
            <div style={{ height: "14px", width: "80%", background: "var(--bg-tertiary)", borderRadius: "8px", marginBottom: "4px" }} />
            <div style={{ height: "14px", width: "60%", background: "var(--bg-tertiary)", borderRadius: "8px", marginBottom: "16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ height: "20px", width: "80px", background: "var(--bg-tertiary)", borderRadius: "8px" }} />
                <div style={{ display: "flex", gap: "4px" }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--bg-tertiary)" }} />)}
                </div>
            </div>
        </div>
    </div>
);

export default function ProductGrid({ search, category, market, onProductClick }: ProductGridProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sort, setSort] = useState("price-asc");
    const [totalCount, setTotalCount] = useState(0);
    const isFirstRender = useRef(true);

    const { ref, inView } = useInView({ threshold: 0, rootMargin: "400px" });

    // Reset when filters change
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
        }
        setProducts([]);
        setPage(1);
        setHasMore(true);
    }, [search, category, market, sort]);

    useEffect(() => {
        if (hasMore && !loading) {
            loadMore();
        }
    }, [inView, search, category, market, sort]);

    const loadMore = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const data = await fetchProducts({
                search,
                category,
                market,
                sort,
                page,
                limit: 24
            });

            setProducts(prev => (page === 1 ? data.products : [...prev, ...data.products]));
            setTotalCount(data.pagination.total);
            setHasMore(data.pagination.hasMore);
            if (data.pagination.hasMore) {
                setPage(prev => prev + 1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Category display name mapping
    const categoryLabel: Record<string, string> = {
        "icecek": "İçecekler",
        "sut-urunleri": "Süt Ürünleri",
        "atistirmalik": "Atıştırmalık",
        "temizlik": "Temizlik",
        "kisisel-bakim": "Kişisel Bakım",
        "temel-gida": "Temel Gıda",
        "meyve-sebze": "Meyve & Sebze",
        "et-tavuk": "Et & Tavuk",
        "dondurulmus": "Dondurulmuş",
        "bebek": "Bebek Ürünleri",
    };

    const title = category && category !== "hepsi"
        ? (categoryLabel[category] || category.replace(/-/g, " "))
        : "Tüm Ürünler";

    return (
        <div>
            {/* Section Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem"
            }}>
                <div>
                    <h2 style={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        fontFamily: "Outfit, sans-serif",
                        color: "var(--text-primary)",
                        textTransform: "uppercase",
                        letterSpacing: "-0.02em"
                    }}>
                        {title}
                        <span style={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            marginLeft: "10px",
                            fontFamily: "Inter, sans-serif"
                        }}>
                            ({loading && products.length === 0 ? "..." : totalCount.toLocaleString("tr-TR")})
                        </span>
                    </h2>
                    {search && (
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            "<strong>{search}</strong>" için sonuçlar
                        </p>
                    )}
                </div>

                {/* Sort */}
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    style={{
                        background: "var(--bg-tertiary)",
                        border: "none",
                        outline: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "99px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        cursor: "pointer"
                    }}
                >
                    <option value="price-asc">En Düşük Fiyat</option>
                    <option value="price-desc">En Yüksek Fiyat</option>
                    <option value="discount">En Çok İndirim</option>
                    <option value="name_asc">A-Z</option>
                </select>
            </div>

            {/* Grid */}
            <div className="bento-grid">
                <AnimatePresence mode="popLayout">
                    {products.map((p) => (
                        <ProductCard key={p.id} product={p} onClick={() => onProductClick(p.id)} />
                    ))}

                    {loading && Array.from({ length: 8 }).map((_, i) => (
                        <ProductSkeleton key={`skeleton-${i}`} />
                    ))}
                </AnimatePresence>
            </div>

            {/* Infinite scroll trigger */}
            <div ref={ref} style={{ height: "80px" }} />

            {/* Empty state */}
            {products.length === 0 && !loading && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        textAlign: "center",
                        padding: "6rem 2rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "24px"
                    }}
                >
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                        Ürün Bulunamadı
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Farklı bir arama veya filtre deneyin.
                    </p>
                </motion.div>
            )}
        </div>
    );
}
