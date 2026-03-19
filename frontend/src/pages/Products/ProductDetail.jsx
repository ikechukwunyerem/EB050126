// src/pages/Products/ProductDetail.jsx
// GET /api/products/:slug/
// digital_file is null unless user has a paid order for this product

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaShoppingCart, FaDownload, FaArrowLeft, FaCheck, FaBox } from 'react-icons/fa';

import { getProduct }       from '../../api/products';
import { addToCart }        from '../../api/cart';
import { useCartStore }     from '../../store/cartStore';
import { useAuthStore }     from '../../store/authStore';
import { toast }            from '../../components/ui/Toast/Toast';
import Button               from '../../components/ui/Button/Button';
import Spinner              from '../../components/ui/Spinner/Spinner';
import { formatNGN }        from '../../utils/formatCurrency';
import styles from './ProductDetail.module.css';
import SEO from '../../components/seo/SEO';

export default function ProductDetail() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn());
  const { setCart } = useCartStore();
  const [qty, setQty] = useState(1);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['products', 'detail', slug],
    queryFn:  () => getProduct(slug),
    enabled:  Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: () => addToCart(product.id, qty),
    onSuccess: (cartData) => {
      setCart(cartData);
      qc.setQueryData(['cart'], cartData);
      toast.success(`${product.name} added to cart!`);
    },
    onError: () => toast.error('Could not add to cart. Please try again.'),
  });

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    addMutation.mutate();
  };

  if (isLoading) return <div className={styles.page}><div className="container"><Spinner fullPage message="Loading product…" /></div></div>;

  if (isError || !product) {
    return (
      <div className={styles.page}><div className="container">
        <div className={styles.errorState}>
          <h2>Product not found</h2>
          <Button onClick={() => navigate('/products')}><FaArrowLeft aria-hidden="true" /> Back to Shop</Button>
        </div>
      </div></div>
    );
  }

  const isDigital  = product.product_type === 'digital';
  const inStock    = isDigital || (product.stock !== null && product.stock > 0);
  const hasFile    = Boolean(product.digital_file);
  const imgSrc     = product.cover_image || product.thumbnail;

  return (
    <div className={styles.page}>
      <SEO
        title={product.name}
        description={product.description?.slice(0, 155) || undefined}
        image={product.cover_image || product.thumbnail || undefined}
      />

      <div className="container">
        <Link to="/products" className={styles.back}><FaArrowLeft aria-hidden="true" /> Back to Shop</Link>

        <div className={styles.layout}>

          {/* Image */}
          <div className={styles.imageCol}>
            <div className={styles.imgWrapper}>
              {imgSrc ? (
                <img src={imgSrc} alt={product.name} className={styles.img}
                  onError={(e) => { e.target.onerror = null; e.target.src = '/images/product-placeholder.png'; }} />
              ) : (
                <div className={styles.imgPlaceholder}>
                  {isDigital ? <FaDownload aria-hidden="true" /> : <FaBox aria-hidden="true" />}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className={styles.infoCol}>
            {product.category && (
              <Link to={`/products?category__slug=${product.category.slug}`} className={styles.categoryLink}>
                {product.category.name}
              </Link>
            )}

            <h1 className={styles.title}>{product.name}</h1>

            <div className={styles.badges}>
              <span className={`${styles.typeBadge} ${isDigital ? styles.typeDigital : styles.typePhysical}`}>
                {isDigital ? 'Digital' : 'Physical'}
              </span>
              {!inStock && <span className={styles.outOfStock}>Out of Stock</span>}
            </div>

            <div className={styles.price}>{formatNGN(product.price)}</div>

            {product.description && (
              <p className={styles.description}>{product.description}</p>
            )}

            {/* Digital file download (only if purchased) */}
            {isDigital && hasFile && (
              <div className={styles.downloadBox}>
                <FaCheck className={styles.downloadCheckIcon} aria-hidden="true" />
                <div>
                  <p className={styles.downloadTitle}>You own this product</p>
                  <a href={product.digital_file} download target="_blank" rel="noopener noreferrer"
                    className={styles.downloadLink}>
                    <FaDownload aria-hidden="true" /> Download File
                  </a>
                </div>
              </div>
            )}

            {/* Add to cart */}
            {!hasFile && (
              <div className={styles.cartArea}>
                {!isDigital && inStock && (
                  <div className={styles.qtyRow}>
                    <label htmlFor="qty" className={styles.qtyLabel}>Quantity</label>
                    <div className={styles.qtyControl}>
                      <button type="button" className={styles.qtyBtn}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1} aria-label="Decrease quantity">−</button>
                      <input id="qty" type="number" className={styles.qtyInput}
                        value={qty} min={1} max={product.stock ?? 99}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        aria-label="Quantity" />
                      <button type="button" className={styles.qtyBtn}
                        onClick={() => setQty((q) => Math.min(product.stock ?? 99, q + 1))}
                        disabled={product.stock !== null && qty >= product.stock}
                        aria-label="Increase quantity">+</button>
                    </div>
                    {product.stock !== null && (
                      <span className={styles.stockNote}>{product.stock} in stock</span>
                    )}
                  </div>
                )}

                <Button
                  size="lg"
                  fullWidth
                  leftIcon={<FaShoppingCart />}
                  onClick={handleAddToCart}
                  isLoading={addMutation.isPending}
                  disabled={!inStock}
                >
                  {inStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
