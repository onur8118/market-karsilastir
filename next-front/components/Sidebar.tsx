"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCategories, fetchMarkets } from "@/lib/api";
import { ChevronDown, ChevronUp } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
    "icecek": "🥤",
    "sut-urunleri": "🧀",
    "atistirmalik": "🍫",
    "temizlik": "🧹",
    "kisisel-bakim": "🧴",
    "temel-gida": "🌾",
    "meyve-sebze": "🍎",
    "et-tavuk": "🥩",
    "dondurulmus": "🧊",
    "bebek": "👶",
};

const CATEGORY_LABELS: Record<string, string> = {
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

interface SidebarProps {
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    selectedMarket: string;
    onSelectMarket: (market: string) => void;
}

const S = {
    sidebar: {
        width: "260px",
        minWidth: "260px",
        height: "100vh",
        position: "fixed" as const,
        top: 0,
        left: 0,
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--border-light)",
        display: "flex",
        flexDirection: "column" as const,
        overflowY: "auto" as const,
        zIndex: 100,
    },
    logo: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "1.25rem",
        borderBottom: "1px solid var(--border-light)",
    },
    logoIcon: {
        width: "32px",
        height: "32px",
        background: "#10b981",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
    },
    logoText: {
        fontFamily: "Outfit, sans-serif",
        fontSize: "1.15rem",
        fontWeight: 900,
        color: "var(--text-primary)",
        letterSpacing: "-0.03em",
    },
    section: {
        padding: "0.75rem",
    },
    sectionBtn: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        marginBottom: "4px",
        background: "none",
        border: "none",
        cursor: "pointer",
        borderRadius: "8px",
    },
    sectionTitle: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.68rem",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        color: "var(--text-muted)",
    },
    item: (active: boolean) => ({
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px",
        marginBottom: "2px",
        background: active ? "rgba(16,185,129,0.1)" : "none",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "0.85rem",
        fontWeight: active ? 700 : 500,
        color: active ? "#10b981" : "var(--text-secondary)",
        textAlign: "left" as const,
        transition: "all 0.15s ease",
    }),
    dot: (color: string) => ({
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
    }),
};

export default function Sidebar({ selectedCategory, onSelectCategory, selectedMarket, onSelectMarket }: SidebarProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [markets, setMarkets] = useState<any[]>([]);
    const [marketsOpen, setMarketsOpen] = useState(true);
    const [categoriesOpen, setCategoriesOpen] = useState(true);

    useEffect(() => {
        fetchCategories().then(setCategories).catch(console.error);
        fetchMarkets().then(setMarkets).catch(console.error);
    }, []);

    return (
        <aside style={S.sidebar}>
            {/* Logo */}
            <div style={S.logo}>
                <div style={S.logoIcon}>⚡</div>
                <span style={S.logoText}>
                    fiyat<span style={{ color: "#10b981" }}>radar</span>
                </span>
            </div>

            {/* Markets */}
            <div style={S.section}>
                <button style={S.sectionBtn} onClick={() => setMarketsOpen(!marketsOpen)}>
                    <span style={S.sectionTitle}>🛒 Marketler</span>
                    {marketsOpen ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
                </button>

                <AnimatePresence initial={false}>
                    {marketsOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                        >
                            <button style={S.item(selectedMarket === "")} onClick={() => onSelectMarket("")}>
                                <span style={S.dot("#10b981")} />
                                Tüm Marketler
                            </button>
                            {markets.map((m) => (
                                <button
                                    key={m.id}
                                    style={S.item(selectedMarket === m.id)}
                                    onClick={() => onSelectMarket(selectedMarket === m.id ? "" : m.id)}
                                    onMouseEnter={(e) => {
                                        if (selectedMarket !== m.id) {
                                            e.currentTarget.style.background = "var(--bg-tertiary)";
                                            e.currentTarget.style.color = "var(--text-primary)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedMarket !== m.id) {
                                            e.currentTarget.style.background = "none";
                                            e.currentTarget.style.color = "var(--text-secondary)";
                                        }
                                    }}
                                >
                                    <span style={S.dot(m.color)} />
                                    {m.name}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "var(--border-light)", margin: "0 0.75rem" }} />

            {/* Categories */}
            <div style={S.section}>
                <button style={S.sectionBtn} onClick={() => setCategoriesOpen(!categoriesOpen)}>
                    <span style={S.sectionTitle}>📦 Kategoriler</span>
                    {categoriesOpen ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
                </button>

                <AnimatePresence initial={false}>
                    {categoriesOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                        >
                            <button style={S.item(selectedCategory === "")} onClick={() => onSelectCategory("")}>
                                <span style={{ fontSize: "1rem", width: "16px", textAlign: "center" }}>🏪</span>
                                Tümü
                            </button>
                            {categories.map((cat: any) => {
                                const catId = typeof cat === "string" ? cat : (cat?.id || String(cat));
                                const catLabel = typeof cat === "string"
                                    ? (CATEGORY_LABELS[cat] || cat.replace(/-/g, " "))
                                    : (cat?.name || catId.replace(/-/g, " "));
                                const catIcon = CATEGORY_ICONS[catId] || "📦";
                                return (
                                    <button
                                        key={catId}
                                        style={S.item(selectedCategory === catId)}
                                        onClick={() => onSelectCategory(selectedCategory === catId ? "" : catId)}
                                        onMouseEnter={(e) => {
                                            if (selectedCategory !== catId) {
                                                e.currentTarget.style.background = "var(--bg-tertiary)";
                                                e.currentTarget.style.color = "var(--text-primary)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedCategory !== catId) {
                                                e.currentTarget.style.background = "none";
                                                e.currentTarget.style.color = "var(--text-secondary)";
                                            }
                                        }}
                                    >
                                        <span style={{ fontSize: "1rem", width: "16px", textAlign: "center" }}>{catIcon}</span>
                                        {catLabel}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </aside>
    );
}
