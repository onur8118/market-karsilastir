"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import ProductModal from "@/components/ProductModal";

const SIDEBAR_WIDTH = 260;

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [market, setMarket] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProductClick = (id: number) => {
    setSelectedProductId(id);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Fixed Left Sidebar */}
      <Sidebar
        selectedCategory={category}
        onSelectCategory={setCategory}
        selectedMarket={market}
        onSelectMarket={setMarket}
      />

      {/* Main content pushed right by sidebar width */}
      <main style={{
        marginLeft: `${SIDEBAR_WIDTH}px`,
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}>
        {/* Sticky Topbar */}
        <Topbar onSearch={setSearch} />

        {/* Product Grid */}
        <div style={{ padding: "2rem", flex: 1 }}>
          <ProductGrid
            search={search}
            category={category}
            market={market}
            onProductClick={handleProductClick}
          />
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: "1px solid var(--border-light)",
          padding: "1.25rem 2rem",
          textAlign: "center",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}>
          © 2026 FiyatRadar — Akıllı Fiyat Takibi
        </footer>
      </main>

      {/* Product Detail Modal */}
      <ProductModal
        productId={selectedProductId!}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
