"use client";

import { useState } from "react";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product, onCompareToggle, isComparing, isHighlighted }) {
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const priceDisplay = () => {
        if (!product.minPrice) return "Price not available";
        if (product.maxPrice && product.maxPrice !== product.minPrice) {
            return `$${product.minPrice.toFixed(2)} – $${product.maxPrice.toFixed(2)}`;
        }
        return `$${product.minPrice.toFixed(2)}`;
    };

    const hasPromo = product.promo && product.promo.trim().length > 0;
    const hasTag = product.productTag && product.productTag.trim().length > 0;

    return (
        <div className={`${styles.card} ${isComparing ? styles.comparing : ""} ${isHighlighted ? styles.highlighted : ""}`}>
            {/* Image */}
            <div className={styles.imageWrapper}>
                <img
                    src={product.image || product.thumbnail}
                    alt={product.name}
                    className={styles.image}
                    loading="lazy"
                />
                {/* Badges */}
                <div className={styles.badges}>
                    {hasTag && <span className={styles.badgeTag}>{product.productTag}</span>}
                    {product.onSale && <span className={styles.badgeSale}>Sale</span>}
                </div>
                {/* 1-Hr Delivery Badge - Bottom Right */}
                {product.isOneHourDelivery && (
                    <span className={styles.badgeDelivery}>⚡ 1-Hr Delivery</span>
                )}
                {/* Compare Button - Top Right */}
                <button
                    className={`${styles.compareButton} ${isComparing ? styles.compareActive : ""}`}
                    onClick={(e) => {
                        e.preventDefault();
                        onCompareToggle?.(product.id);
                    }}
                    id={`compare-product-${product.id}`}
                    title={isComparing ? "Remove from compare" : "Add to compare"}
                >
                    {isComparing ? "✓" : "⚖️"}
                </button>
            </div>

            {/* Info */}
            <div className={styles.info}>
                <h3 className={styles.name}>{product.name}</h3>

                {product.description && (
                    <div className={styles.descriptionWrapper}>
                        <p className={`${styles.description} ${isDescExpanded ? styles.expanded : ''}`}>
                            {product.description}
                        </p>
                        {product.description.length > 100 && (
                            <button
                                className={styles.readMoreBtn}
                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                            >
                                {isDescExpanded ? 'Read less' : 'Read more'}
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.priceRow}>
                    <span className={styles.price}>{priceDisplay()}</span>
                    {product.sizeCount > 1 && (
                        <span className={styles.sizes}>{product.sizeCount} sizes</span>
                    )}
                </div>

                {product.occasion && (
                    <div className={styles.occasions}>
                        {product.occasion
                            .split(",")
                            .slice(0, 3)
                            .map((occ, i) => (
                                <span key={i} className={styles.occasionChip}>
                                    {occ.trim()}
                                </span>
                            ))}
                    </div>
                )}

                {hasPromo && <p className={styles.promo}>{product.promo}</p>}
            </div>
        </div>
    );
}
