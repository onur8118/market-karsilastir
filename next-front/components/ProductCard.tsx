"use client";

import { motion } from "framer-motion";
import { TrendingDown, Plus } from "lucide-react";
import { useCart } from "@/lib/CartContext";

interface Product {
    id: number;
    name: string;
    brand: string;
    category: string;
    barcode: string;
    image_url: string;
    prices: {
        marketId: string;
        marketName: string;
        marketColor: string;
        price: number;
        originalPrice: number;
        date: string;
    }[];
}

export default function ProductCard({ product, onClick }: { product: Product, onClick: () => void }) {
    const { addToCart } = useCart();
    const sortedPrices = [...(product.prices || [])].sort((a, b) => a.price - b.price);
    const minPrice = sortedPrices.length > 0 ? sortedPrices[0].price : 0;

    // Simple logic: If current price is significantly lower than average price in the product modal (mock/proxy logic for now)
    // Or if it's the only market selling it. Let's show a "Best Deal" badge for the cheapest market.
    const isSpecialDeal = product.prices.some(p => p.originalPrice && p.price < p.originalPrice);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="product-card group relative"
            onClick={onClick}
        >
            {isSpecialDeal && (
                <div className="absolute top-3 left-3 z-10 bg-accent-primary text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                    <TrendingDown size={10} />
                    FIRSAT
                </div>
            )}

            <div className="card-image-wrap">
                <img
                    src={product.image_url || '/placeholder.png'}
                    alt={product.name}
                    loading="lazy"
                    className="group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Resim+Bulunamadı';
                    }}
                />
            </div>

            <div className="card-body">
                <div className="card-brand">{product.brand || "Diğer"}</div>
                <h3 className="card-title line-clamp-2" title={product.name}>
                    {product.name}
                </h3>

                <div className="card-footer">
                    <div className="price-main">
                        {minPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        <span className="price-symbol">₺</span>
                    </div>

                    <div className="market-dot-group">
                        {sortedPrices.map((p) => (
                            <div
                                key={p.marketId}
                                className="market-dot"
                                style={{ background: p.marketColor }}
                                title={p.marketName}
                            />
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (sortedPrices.length > 0) {
                                const p = sortedPrices[0];
                                addToCart({
                                    id: product.id,
                                    name: product.name,
                                    brand: product.brand,
                                    price: p.price,
                                    marketId: p.marketId,
                                    marketName: p.marketName,
                                    marketColor: p.marketColor,
                                    image: product.image_url
                                });
                            }
                        }}
                        className="bg-accent-primary text-white p-2 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title="Sepete Ekle"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
