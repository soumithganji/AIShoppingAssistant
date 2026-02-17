"use client";

import { useState, useEffect, useRef } from "react";
import ProductCard from "./ProductCard";
import styles from "./ProductGrid.module.css";

export default function ProductGrid({ products, isLoading, onCompare, highlightedProductId }) {
    const [compareIds, setCompareIds] = useState(new Set());
    const [isComparing, setIsComparing] = useState(false);
    const [compareResult, setCompareResult] = useState(null);
    const productRefs = useRef({});

    // Scroll to highlighted product
    useEffect(() => {
        if (highlightedProductId && productRefs.current[highlightedProductId]) {
            productRefs.current[highlightedProductId].scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [highlightedProductId]);

    const toggleCompare = (productId) => {
        setCompareIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else if (next.size < 3) {
                next.add(productId);
            }
            return next;
        });
    };

    const handleCompare = () => {
        if (compareIds.size < 2) return;
        const selectedProducts = products.filter((p) => compareIds.has(p.id));
        setCompareResult(selectedProducts);
        setIsComparing(true);
    };

    const closeCompare = () => {
        setIsComparing(false);
        setCompareResult(null);
        setCompareIds(new Set());
    };

    // Render comparison table from product array
    const renderComparisonTable = (productsToCompare) => {
        if (!productsToCompare || productsToCompare.length < 2) return null;

        return (
            <table className={styles.comparisonTable}>
                <thead>
                    <tr>
                        <th>Feature</th>
                        {productsToCompare.map((p) => (
                            <th key={p.id}>{p.name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Price</td>
                        {productsToCompare.map((p) => (
                            <td key={p.id}>
                                ${p.minPrice?.toFixed(2)}
                                {p.maxPrice && p.maxPrice !== p.minPrice && ` - $${p.maxPrice.toFixed(2)}`}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td>Sizes</td>
                        {productsToCompare.map((p) => (
                            <td key={p.id}>{p.sizeCount || 1} option(s)</td>
                        ))}
                    </tr>
                    <tr>
                        <td>Best For</td>
                        {productsToCompare.map((p) => (
                            <td key={p.id}>{p.occasion || "Any occasion"}</td>
                        ))}
                    </tr>
                    <tr>
                        <td>1-Hour Delivery</td>
                        {productsToCompare.map((p) => (
                            <td key={p.id}>{p.isOneHourDelivery ? "✅ Yes" : "❌ No"}</td>
                        ))}
                    </tr>
                    <tr>
                        <td>Special</td>
                        {productsToCompare.map((p) => (
                            <td key={p.id}>{p.productTag || p.promo || "—"}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
        );
    };

    return (
        <div className={styles.gridPanel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2>
                        {products.length > 0
                            ? `${products.length} Recommendations`
                            : "Product Recommendations"}
                    </h2>
                    <span className={styles.subtitle}>
                        {products.length > 0
                            ? "Based on your preferences"
                            : "Start a conversation to see recommendations"}
                    </span>
                </div>

                {compareIds.size >= 2 && !isComparing && (
                    <button className={styles.compareBtn} onClick={handleCompare}>
                        ⚖️ Compare {compareIds.size} Items
                    </button>
                )}
            </div>

            {/* Compare Modal */}
            {isComparing && (
                <div className={styles.compareOverlay}>
                    <div className={styles.compareModal}>
                        <div className={styles.compareHeader}>
                            <h3>Product Comparison</h3>
                            <button className={styles.closeBtn} onClick={closeCompare}>
                                ✕
                            </button>
                        </div>
                        <div className={styles.compareBody}>
                            {renderComparisonTable(compareResult)}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Grid */}
            <div className={styles.gridContainer}>
                {isLoading && products.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.loadingPulse}>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className={styles.skeletonCard}>
                                    <div className={styles.skeletonImage}></div>
                                    <div className={styles.skeletonText}></div>
                                    <div className={styles.skeletonTextShort}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isLoading && products.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🛍️</div>
                        <h3>Your recommendations will appear here</h3>
                        <p>
                            Tell the Gift Concierge what you&apos;re looking for — occasion,
                            budget, recipient — and we&apos;ll curate the perfect options.
                        </p>
                    </div>
                )}

                {products.length > 0 && (
                    <div className={styles.grid}>
                        {products.map((product) => (
                            <div key={product.id} ref={el => productRefs.current[product.id] = el}>
                                <ProductCard
                                    product={product}
                                    isComparing={compareIds.has(product.id)}
                                    onCompareToggle={toggleCompare}
                                    isHighlighted={String(highlightedProductId) === String(product.id)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Compare hint */}
            {products.length > 0 && compareIds.size > 0 && compareIds.size < 2 && (
                <div className={styles.compareHint}>
                    Select {2 - compareIds.size} more product{compareIds.size === 0 ? "s" : ""} to compare
                </div>
            )}
        </div>
    );
}
