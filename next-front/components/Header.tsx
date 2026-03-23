"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Moon, Sun, X, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSuggestions } from "@/lib/api";
import { useCart } from "@/lib/CartContext";
import Link from "next/link";

interface TopbarProps {
    onSearch: (q: string) => void;
}

export default function Topbar({ onSearch }: TopbarProps) {
    const [searchValue, setSearchValue] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const { cart } = useCart();
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const isDark = localStorage.getItem("theme") === "dark" ||
            document.documentElement.classList.contains("dark");
        setDarkMode(isDark);
        if (isDark) document.documentElement.classList.add("dark");

        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchValue.length >= 2) {
                const results = await fetchSuggestions(searchValue);
                setSuggestions(results);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 280);
        return () => clearTimeout(timer);
    }, [searchValue]);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const handleSelect = (name: string) => {
        setSearchValue(name);
        onSearch(name);
        setShowSuggestions(false);
    };

    const clearSearch = () => {
        setSearchValue("");
        onSearch("");
        setShowSuggestions(false);
    };

    return (
        <header className="topbar">
            {/* Search */}
            <div className="topbar-search" ref={searchRef} style={{ position: "relative" }}>
                <div className="search-pill">
                    <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Ürün, marka veya barkod ara..."
                        style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            fontSize: "0.875rem",
                            width: "100%",
                            color: "var(--text-primary)"
                        }}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                onSearch(searchValue);
                                setShowSuggestions(false);
                            }
                            if (e.key === "Escape") clearSearch();
                        }}
                    />
                    {searchValue && (
                        <button onClick={clearSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: 0,
                                right: 0,
                                background: "var(--bg-primary)",
                                border: "1px solid var(--border-light)",
                                borderRadius: "16px",
                                boxShadow: "var(--shadow-lg)",
                                zIndex: 999,
                                padding: "8px",
                                overflow: "hidden"
                            }}
                        >
                            {suggestions.slice(0, 6).map((s: any, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(s.name)}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        color: "var(--text-primary)"
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                                    {s.brand && (
                                        <span style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            color: "var(--text-muted)",
                                            background: "var(--bg-tertiary)",
                                            padding: "2px 8px",
                                            borderRadius: "99px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            {s.brand}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Right side */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                <button
                    onClick={toggleDarkMode}
                    style={{
                        background: "var(--bg-tertiary)",
                        border: "none",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        transition: "all 0.2s"
                    }}
                    title={darkMode ? "Açık mod" : "Koyu mod"}
                >
                    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <Link href="/cart" style={{ textDecoration: "none" }}>
                    <button
                        style={{
                            background: "var(--secondary)",
                            border: "none",
                            borderRadius: "50%",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#fff",
                            position: "relative",
                            transition: "all 0.2s"
                        }}
                        title="Sepetim"
                    >
                        <ShoppingCart size={16} />
                        {cart.length > 0 && (
                            <span style={{
                                position: "absolute",
                                top: "-4px",
                                right: "-4px",
                                background: "#db2777",
                                color: "#fff",
                                fontSize: "10px",
                                fontWeight: "bold",
                                borderRadius: "50%",
                                width: "18px",
                                height: "18px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid var(--bg-primary)"
                            }}>
                                {cart.length}
                            </span>
                        )}
                    </button>
                </Link>
            </div>
        </header>
    );
}
