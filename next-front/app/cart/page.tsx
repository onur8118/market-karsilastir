"use client";

import { useCart } from "@/lib/CartContext";
import { Trash2, ShoppingCart, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const formatPrice = (p: number) => p.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CartPage() {
    const { cart, removeFromCart, clearCart, total } = useCart();

    // Grouping by market
    const marketBreakdown: Record<string, { total: number; count: number; color: string }> = {};
    cart.forEach(item => {
        if (!marketBreakdown[item.marketName]) {
            marketBreakdown[item.marketName] = { total: 0, count: 0, color: item.marketColor };
        }
        marketBreakdown[item.marketName].total += item.price;
        marketBreakdown[item.marketName].count += 1;
    });

    const sortedMarkets = Object.keys(marketBreakdown).sort((a, b) => marketBreakdown[a].total - marketBreakdown[b].total);

    return (
        <div className="min-h-screen bg-bg-secondary p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors group">
                        <div className="p-2 rounded-xl bg-bg-primary shadow-sm group-hover:scale-110 transition-transform">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Alışverişe Dön</span>
                    </Link>

                    <h1 className="text-2xl font-black text-text-primary font-display flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-lg">
                            <ShoppingCart size={20} />
                        </div>
                        Sepetim
                    </h1>

                    {cart.length > 0 && (
                        <button
                            onClick={clearCart}
                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            Listeyi Temizle
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-bg-primary rounded-3xl p-12 text-center shadow-premium border border-border-light"
                    >
                        <div className="w-20 h-20 bg-bg-tertiary rounded-3xl flex items-center justify-center mx-auto mb-6 text-text-muted">
                            <ShoppingCart size={40} />
                        </div>
                        <h2 className="text-xl font-black text-text-primary mb-2">Sepetiniz Boş</h2>
                        <p className="text-text-muted text-sm mb-8 max-w-xs mx-auto">Listeye ürün ekleyerek en ucuz market kombinasyonunu görebilirsiniz.</p>
                        <Link href="/">
                            <button className="bg-accent-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all">
                                Ürünleri Keşfet
                            </button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* List */}
                        <div className="lg:col-span-2 space-y-4">
                            <AnimatePresence mode="popLayout">
                                {cart.map((item, idx) => (
                                    <motion.div
                                        key={`${item.id}-${idx}`}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-bg-primary rounded-2xl p-4 shadow-sm border border-border-light flex items-center gap-4 group"
                                    >
                                        <div className="w-20 h-20 bg-white rounded-xl overflow-hidden p-2 border border-border-light flex-shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black text-accent-primary uppercase tracking-wider">{item.brand || "Diğer"}</div>
                                            <h3 className="font-bold text-text-primary text-sm truncate">{item.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="w-2 h-2 rounded-full" style={{ background: item.marketColor }}></span>
                                                <span className="text-xs font-bold text-text-muted">{item.marketName}</span>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end gap-2">
                                            <div className="text-lg font-black text-text-primary">{formatPrice(item.price)} ₺</div>
                                            <button
                                                onClick={() => removeFromCart(idx)}
                                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Summary */}
                        <div className="space-y-6">
                            <div className="bg-text-primary text-white rounded-3xl p-8 shadow-premium relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Toplam Tutar</div>
                                    <div className="text-4xl font-black mb-8">{formatPrice(total)} <small className="text-lg">₺</small></div>

                                    <div className="space-y-4 mb-4">
                                        {sortedMarkets.map((market, idx) => (
                                            <div key={market} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ background: marketBreakdown[market].color }}></span>
                                                    <span className="text-xs font-bold opacity-80">{market} ({marketBreakdown[market].count})</span>
                                                </div>
                                                <div className="text-sm font-black">{formatPrice(marketBreakdown[market].total)} ₺</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-secondary/20 rounded-full blur-3xl"></div>
                            </div>

                            <div className="bg-bg-primary rounded-3xl p-6 shadow-sm border border-border-light">
                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Bilgilendirme</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                            <ChevronRight size={14} />
                                        </div>
                                        <p className="text-[11px] font-medium text-text-secondary leading-relaxed">
                                            Sepetinizdeki ürünlerin toplam fiyatı, seçtiğiniz marketlerin o günkü fiyatları üzerinden hesaplanmıştır.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
