"use client";

import { motion } from "framer-motion";

export default function Hero() {
    return (
        <section className="relative pt-40 pb-20 overflow-hidden hero-gradient">
            <div className="container-premium text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                >
                    <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] text-accent-primary uppercase glass-pill">
                        Premium Fiyat Karşılaştırma
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black text-text-primary mb-6 tracking-tighter leading-tight">
                        Akıllı Alışverişin <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600">
                            Yeni Standardı.
                        </span>
                    </h1>
                    <p className="max-w-xl mx-auto text-text-muted text-lg font-medium leading-relaxed">
                        Market fiyatlarını gerçeğe en yakın şekilde takip edin,
                        yapay zeka destekli analizlerle en doğru zamanda satın alın.
                    </p>
                </motion.div>

                {/* Floating Decorative Elements */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
            </div>
        </section>
    );
}
