// src/pages/Products/ProductListing.jsx
// GET /api/products/?page=&category__slug=&product_type=&search=&ordering=

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaTimes, FaSearch, FaChevronDown } from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getProducts, getProductCategories } from '../../api/products';
import { addToCart } from '../../api/cart';
import { useCartStore } from '../../store/cartStore';
import { toast }        from '../../components/ui/Toast/Toast';
import ProductCard  from '../../components/cards/ProductCard';
import Pagination   from '../../components/ui/Pagination/Pagination';
import useDebounce  from '../../hooks/useDebounce';
import styles from './ProductListing.module.css';
import SEO from '../../components/seo/SEO';

const PAGE_SIZE = 12;

const PRODUCT_TYPES = [
  { value: '',         label: 'All'      },
  { value: 'digital',  label: 'Digital'  },
  { value: 'physical', label: 'Physical' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest'       },
  { value: 'price',       label: 'Price: Low'   },
  { value: '-price',      label: 'Price: High'  },
  { value: 'name',        label: 'A \u2013 Z'   },
];

export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput]   = useState(searchParams.get('search') || '');
  const qc        = useQueryClient();
  const { setCart } = useCartStore();

  const page         = parseInt(searchParams.get('page')         || '1', 10);
  const categorySlug = searchParams.get('category__slug')        || '';
  const productType  = searchParams.get('product_type')          || '';
  const ordering     = searchParams.get('ordering')              || '-created_at';
  const search       = searchParams.get('search')                || '';

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch === search) return;
    const next = new URLSearchParams(searchParams);
    debouncedSearch ? next.set('search', debouncedSearch) : next.delete('search');
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch]); // eslint-disable-line

  const apiParams = {
    page, page_size: PAGE_SIZE,
    ...(categorySlug && { 'category__slug': categorySlug }),
    ...(productType  && { product_type: productType }),
    ...(ordering     && { ordering }),
    ...(search       && { search }),
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['products', 'list', apiParams],
    queryFn:  () => getProducts(apiParams),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000,
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn:  getProductCategories,
    staleTime: 30 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (productId) => addToCart(productId, 1),
    onSuccess: (cartData) => {
      setCart(cartData);
      qc.setQueryData(['cart'], cartData);
      toast.success('Added to cart!');
    },
    onError: () => toast.error('Could not add to cart.'),
  });

  const products   = data?.results || [];
  const total      = data?.count   || 0;
  const hasFilters = Boolean(categorySlug || productType || search);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    value ? next.set(key, value) : next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const clearAll = () => { setSearchInput(''); setSearchParams(new URLSearchParams({ ordering })); };

  const handlePage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Shop"
        description="Physical and digital educational products for Nigerian teachers and parents."
      />

      <div className="container">

        <header className={styles.header}>
          <h1 className={styles.title}>Shop</h1>
          <p className={styles.subtitle}>Physical and digital educational products.</p>
        </header>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Category pills */}
          <div className={styles.categoryPills}>
            <button
              type="button"
              className={`${styles.catPill} ${!categorySlug ? styles.catPillActive : ''}`}
              onClick={() => setParam('category__slug', '')}
            >All</button>
            {!catsLoading && categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.catPill} ${categorySlug === c.slug ? styles.catPillActive : ''}`}
                onClick={() => setParam('category__slug', c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className={styles.toolbarRight}>
            {/* Type filter */}
            <div className={styles.typeGroup}>
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeBtn} ${productType === t.value ? styles.typeBtnActive : ''}`}
                  onClick={() => setParam('product_type', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search products…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search products"
              />
            </div>

            {/* Sort */}
            <div className={styles.sortBox}>
              <select
                className={styles.sortSelect}
                value={ordering}
                onChange={(e) => setParam('ordering', e.target.value)}
                aria-label="Sort products"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <FaChevronDown className={styles.sortArrow} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className={styles.meta}>
          {!isLoading && !isError && (
            <span className={styles.count}>
              {total === 0 ? 'No products found' : `${total.toLocaleString()} product${total !== 1 ? 's' : ''}`}
            </span>
          )}
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearAll}>
              <FaTimes aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>

        {isError && (
          <div className={styles.errorBanner} role="alert">
            Failed to load products. Please try again.
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className={styles.grid}>
            {[...Array(PAGE_SIZE)].map((_, i) => <ProductCard key={i} loading />)}
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">🛍️</span>
            <h3>No products found</h3>
            {hasFilters && (
              <button type="button" className={styles.emptyClear} onClick={clearAll}>Clear filters</button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(prod) => addMutation.mutate(prod.id)}
              />
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <Pagination count={total} page={page} pageSize={PAGE_SIZE} onPageChange={handlePage} />
        )}
      </div>
    </div>
  );
}
