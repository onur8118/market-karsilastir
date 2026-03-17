"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, Clock, CheckCircle2, ShoppingCart, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchProductDetail, fetchBestTime } from "@/lib/api";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const formatPrice = (p: number) => p.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ProductModalProps {
    productId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProductModal({ productId, isOpen, onClose }: ProductModalProps) {
    const [data, setData] = useState<any>(null);
    const [bestTime, setBestTime] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && productId) {
            setLoading(true);
            Promise.all([
                fetchProductDetail(productId),
                fetchBestTime(productId)
            ]).then(([detail, analysis]) => {
                setData(detail);
                setBestTime(analysis);
            }).catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setData(null);
            setBestTime(null);
        }
    }, [isOpen, productId]);

    const chartData = data && data.priceHistory ? {
        labels: data.priceHistory.map((p: any) => new Date(p.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })),
        datasets: [{
            label: 'Fiyat (₺)',
            data: data.priceHistory.map((p: any) => p.price),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            borderWidth: 3,
        }]
    } : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-text-primary/20 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="relative w-full max-w-5xl h-[92vh] sm:h-auto sm:max-h-[85vh] bg-bg-primary sm:rounded-3xl shadow-premium overflow-hidden flex flex-col md:flex-row"
                    >
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-bg-tertiary hover:bg-border-medium z-10 transition-transform active:scale-95">
                            <X className="w-5 h-5 text-text-muted" />
                        </button>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
                            </div>
                        ) : data ? (
                            <>
                                {/* Left: Visual Sidebar */}
                                <div className="w-full md:w-[400px] bg-bg-secondary p-8 flex flex-col items-center border-r border-border-light">
                                    <div className="w-full aspect-square bg-white rounded-3xl p-8 shadow-sm mb-8 flex items-center justify-center group">
                                        <img src={data.image_url} alt={data.name} className="max-h-full object-contain transition-transform group-hover:scale-110" />
                                    </div>
                                    <div className="w-full">
                                        <span className="text-xs font-black text-accent-primary uppercase tracking-[0.2em]">{data.brand || "Diğer"}</span>
                                        <h2 className="text-2xl font-black text-text-primary mt-2 mb-4 leading-tight font-display">{data.name}</h2>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1.5 bg-white border border-border-light text-text-muted rounded-xl text-[10px] font-bold uppercase tracking-wider">{data.category}</span>
                                            {data.barcode && <span className="px-3 py-1.5 bg-white border border-border-light text-text-muted rounded-xl text-[10px] font-bold uppercase tracking-wider">#{data.barcode}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Data Analysis */}
                                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                    <section className="mb-12">
                                        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            Market Teklifleri
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {data.prices && data.prices.map((p: any, idx: number) => (
                                                <div key={p.marketId} className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${idx === 0 ? 'border-accent-primary bg-accent-glow' : 'border-border-light bg-bg-primary hover:border-text-muted'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: p.marketColor }}></span>
                                                        <span className="font-bold text-text-secondary">{p.marketName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-text-primary">{formatPrice(p.price)} <small className="text-xs font-bold">₺</small></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="mb-12">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                                                Fiyat Analizi
                                            </h3>
                                            {bestTime && bestTime.hasData && (
                                                <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${bestTime.isNearAllTimeMin ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    {bestTime.isNearAllTimeMin ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                    <span className="text-[10px] font-black uppercase tracking-wider">{bestTime.isNearAllTimeMin ? "Hemen Al" : "Stabil"}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-[240px] w-full mb-8">
                                            {chartData && <Line data={chartData} options={{
                                                maintainAspectRatio: false,
                                                scales: { y: { display: false }, x: { grid: { display: false } } },
                                                plugins: { legend: { display: false } }
                                            }} />}
                                        </div>

                                        {bestTime && bestTime.hasData && (
                                            <div className="grid grid-cols-2 gap-6 p-6 bg-bg-tertiary rounded-3xl">
                                                <div>
                                                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">En Uygun Market</div>
                                                    <div className="text-lg font-black text-text-primary">{bestTime.cheapestMarket?.marketName}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Tarihi Dip Fiyat</div>
                                                    <div className="text-lg font-black text-text-primary">{formatPrice(bestTime.allTimeMin)} ₺</div>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </div>
                            </>
                        ) : null}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
