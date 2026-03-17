"use client";

import { useEffect, useState } from "react";
import { fetchCategories } from "@/lib/api";

interface CategoryNavProps {
    selectedCategory: string;
    onSelect: (cat: string) => void;
}

export default function CategoryNav({ selectedCategory, onSelect }: CategoryNavProps) {
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchCategories().then(setCategories).catch(console.error);
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={() => onSelect("")}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${selectedCategory === ""
                        ? "bg-text-primary text-white shadow-lg"
                        : "text-text-secondary hover:bg-bg-tertiary"
                    }`}
            >
                Tüm Kategoriler
            </button>

            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all capitalize ${selectedCategory === cat
                            ? "bg-text-primary text-white shadow-lg"
                            : "text-text-secondary hover:bg-bg-tertiary"
                        }`}
                >
                    {cat.replace(/-/g, ' ')}
                </button>
            ))}
        </div>
    );
}
