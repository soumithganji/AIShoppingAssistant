"use client";

import { useState, useCallback } from "react";
import ChatPanel from "@/components/ChatPanel";
import ProductGrid from "@/components/ProductGrid";
import styles from "./page.module.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleProductsUpdate = useCallback((newProducts) => {
    setProducts(newProducts);
  }, []);

  const handleLoadingChange = useCallback((loading) => {
    setIsLoading(loading);
  }, []);

  return (
    <main className={styles.main}>
      {/* Background decoration */}
      <div className={styles.bgGlow1}></div>
      <div className={styles.bgGlow2}></div>

      {/* Split pane layout */}
      <div className={styles.splitPane}>
        <div className={styles.chatSide}>
          <ChatPanel
            onProductsUpdate={handleProductsUpdate}
            onLoadingChange={handleLoadingChange}
          />
        </div>
        <div className={styles.productSide}>
          <ProductGrid products={products} isLoading={isLoading} />
        </div>
      </div>
    </main>
  );
}
