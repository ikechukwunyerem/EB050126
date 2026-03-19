// src/components/cards/ProductCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaDownload, FaBox } from 'react-icons/fa';
import { formatNGN } from '../../utils/formatCurrency';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, loading = false, onAddToCart }) {
  if (loading) {
    return (
      <div className={styles.card} aria-hidden="true">
        <div className={`skeleton ${styles.imgSkeleton}`} />
        <div className={styles.body}>
          <div className={`skeleton ${styles.badgeSkeleton}`} />
          <div className={`skeleton ${styles.titleSkeleton}`} />
          <div className={`skeleton ${styles.titleSkeletonShort}`} />
          <div className={`skeleton ${styles.priceSkeleton}`} />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const { name, slug, price, cover_image, thumbnail, product_type,
          category, is_featured, stock } = product;

  const isDigital  = product_type === 'digital';
  const isInStock  = isDigital || (stock !== null && stock > 0);
  const href       = `/products/${slug}`;

  return (
    <article className={`${styles.card} ${is_featured ? styles.featured : ''}`}>
      <Link to={href} className={styles.imgLink} tabIndex={-1} aria-hidden="true">
        <div className={styles.imgWrapper}>
          {thumbnail || cover_image ? (
            <img
              src={thumbnail || cover_image}
              alt=""
              className={styles.img}
              loading="lazy"
              onError={(e) => { e.target.onerror = null; e.target.src = '/images/product-placeholder.png'; }}
            />
          ) : (
            <div className={styles.imgPlaceholder}>
              {isDigital ? <FaDownload aria-hidden="true" /> : <FaBox aria-hidden="true" />}
            </div>
          )}
          <span className={`${styles.typePill} ${isDigital ? styles.typeDigital : styles.typePhysical}`}>
            {isDigital ? 'Digital' : 'Physical'}
          </span>
        </div>
      </Link>

      <div className={styles.body}>
        {category && (
          <span className={styles.category}>{category.name}</span>
        )}

        <h3 className={styles.title}>
          <Link to={href} className={styles.titleLink}>{name}</Link>
        </h3>

        <div className={styles.footer}>
          <span className={styles.price}>{formatNGN(price)}</span>

          {!isInStock ? (
            <span className={styles.outOfStock}>Out of stock</span>
          ) : onAddToCart ? (
            <button
              type="button"
              className={styles.addBtn}
              onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
              aria-label={`Add ${name} to cart`}
            >
              <FaShoppingCart aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
