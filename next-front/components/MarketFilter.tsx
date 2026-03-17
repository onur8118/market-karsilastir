"use client";

import { useEffect, useState } from "react";
import { fetchMarkets } from "@/lib/api";

interface MarketFilterProps {
    selectedMarket: string;
    onSelect: (id: string) => void;
}

export default function MarketFilter({ selectedMarket, onSelect }: MarketFilterProps) {
    const [markets, setMarkets] = useState<any[]>([]);

    useEffect(() => {
        fetchMarkets().then(setMarkets).catch(console.error);
    }, []);

    return (
        <div className="grid grid-cols-2 gap-2">
            {markets.map((m) => (
                <button
                    key={m.id}
                    onClick={() => onSelect(selectedMarket === m.name ? "" : m.name)}
                    className={`px-4 py-3 rounded-xl font-bold text-sm transition-all border ${selectedMarket === m.name
                            ? "border-text-primary bg-text-primary text-white shadow-md"
                            : "border-border-light text-text-secondary hover:border-text-muted"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }}></span>
                        {m.name}
                    </div>
                </button>
            ))}
        </div>
    );
}
