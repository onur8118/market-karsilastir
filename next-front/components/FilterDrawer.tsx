"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryNav from "./CategoryNav";
import MarketFilter from "./MarketFilter";

interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    selectedMarket: string;
    onSelectMarket: (market: string) => void;
}

export default function FilterDrawer({
    isOpen,
    onClose,
    selectedCategory,
    onSelectCategory,
    selectedMarket,
    onSelectMarket
}: FilterDrawerProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-text-primary/10 backdrop-blur-sm z-[2000]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-bg-primary shadow-premium z-[2001] border-l border-border-light flex flex-col"
                    >
                        <div className="p-6 flex items-center justify-between border-b border-border-light">
                            <h2 className="text-xl font-bold font-display">Filtrele</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-bg-secondary rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-10">
                            <section>
                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6 px-1">Marketler</h3>
                                <MarketFilter
                                    selectedMarket={selectedMarket}
                                    onSelect={onSelectMarket}
                                />
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6 px-1">Kategoriler</h3>
                                <CategoryNav
                                    selectedCategory={selectedCategory}
                                    onSelect={onSelectCategory}
                                />
                            </section>
                        </div>

                        <div className="p-6 border-t border-border-light bg-bg-secondary">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-text-primary text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 active:scale-95 transition-transform"
                            >
                                Sonuçları Göster
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
