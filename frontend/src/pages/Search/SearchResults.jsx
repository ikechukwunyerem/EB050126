// src/pages/Search/SearchResults.jsx
// GET /api/search/?q=<query>
// GET/POST/DELETE /api/search/saved/

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSearch, FaBookmark, FaRegBookmark, FaTimes } from 'react-icons/fa';

import { globalSearch, getSavedSearches, saveSearch, deleteSavedSearch } from '../../api/search';
import { useAuthStore } from '../../store/authStore';
import { toast }        from '../../components/ui/Toast/Toast';
import Spinner          from '../../components/ui/Spinner/Spinner';
import useDebounce      from '../../hooks/useDebounce';
import styles from './SearchResults.module.css';
import SEO from '../../components/seo/SEO';

const TYPE_LABELS = { resource: 'Resource', product: 'Product', blog: 'Blog Post' };
const TYPE_STYLES = { resource: 'typeResource', product: 'typeProduct', blog: 'typeBlog' };

function resultUrl(r) {
  if (r.type === 'resource') return `/resources/${r.id}`;
  if (r.type === 'product')  return `/products/${r.slug}`;
  if (r.type === 'blog')     return `/blog/${r.slug}`;
  return '/search';
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue]     = useState(searchParams.get('q') || '');
  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn());
  const qc          = useQueryClient();

  const query    = searchParams.get('q') || '';
  const dQuery   = useDebounce(inputValue, 400);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    if (dQuery === query) return;
    const next = new URLSearchParams(searchParams);
    dQuery ? next.set('q', dQuery) : next.delete('q');
    setSearchParams(next, { replace: true });
  }, [dQuery]); // eslint-disable-line

  // Search results
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn:  () => globalSearch(query),
    enabled:  query.trim().length >= 2,
    staleTime: 60 * 1000,
  });

  const allResults    = data?.results    || [];
  const filteredResults = typeFilter
    ? allResults.filter((r) => r.type === typeFilter)
    : allResults;

  const typeCounts = allResults.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  // Saved searches
  const { data: savedData } = useQuery({
    queryKey: ['search', 'saved'],
    queryFn:  getSavedSearches,
    enabled:  isLoggedIn,
    staleTime: 2 * 60 * 1000,
  });
  const savedSearches  = savedData?.results || [];
  const isQuerySaved   = savedSearches.some((s) => s.query === query);

  const saveMutation = useMutation({
    mutationFn: () => saveSearch(query),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['search', 'saved'] }); toast.success('Search saved!'); },
    onError:   () => toast.error('Could not save search.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSavedSearch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['search', 'saved'] }); toast.success('Search removed.'); },
    onError:   () => toast.error('Could not remove search.'),
  });

  const handleSaveToggle = () => {
    if (!isLoggedIn) { toast.info('Sign in to save searches.'); return; }
    if (isQuerySaved) {
      const saved = savedSearches.find((s) => s.query === query);
      if (saved) deleteMutation.mutate(saved.id);
    } else {
      saveMutation.mutate();
    }
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Search"
        description="Search resources, products, and blog posts on Efiko Education."
      />

      <div className="container">

        {/* Search bar */}
        <div className={styles.searchBarRow}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search resources, products, articles…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              aria-label="Search Efiko"
              autoFocus
            />
            {inputValue && (
              <button type="button" className={styles.clearBtn}
                onClick={() => { setInputValue(''); setSearchParams({}); }}
                aria-label="Clear search">
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </div>

          {query && isLoggedIn && (
            <button
              type="button"
              className={`${styles.saveBtn} ${isQuerySaved ? styles.saveBtnActive : ''}`}
              onClick={handleSaveToggle}
              disabled={saveMutation.isPending || deleteMutation.isPending}
              aria-pressed={isQuerySaved}
            >
              {isQuerySaved
                ? <><FaBookmark    aria-hidden="true" /> Saved</>
                : <><FaRegBookmark aria-hidden="true" /> Save search</>
              }
            </button>
          )}
        </div>

        {/* No query yet — show saved searches */}
        {!query && (
          <div className={styles.noQuery}>
            {isLoggedIn && savedSearches.length > 0 ? (
              <div className={styles.savedSection}>
                <h2 className={styles.savedTitle}>Saved Searches</h2>
                <ul className={styles.savedList}>
                  {savedSearches.map((s) => (
                    <li key={s.id} className={styles.savedItem}>
                      <button
                        type="button"
                        className={styles.savedQuery}
                        onClick={() => { setInputValue(s.query); setSearchParams({ q: s.query }); }}
                      >
                        <FaSearch aria-hidden="true" /> {s.query}
                      </button>
                      <button
                        type="button"
                        className={styles.savedDelete}
                        onClick={() => deleteMutation.mutate(s.id)}
                        aria-label={`Remove saved search: ${s.query}`}
                      >
                        <FaTimes aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.promptState}>
                <FaSearch className={styles.promptIcon} aria-hidden="true" />
                <p>Type to search resources, products, and articles.</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {query && (
          <div className={styles.resultsArea}>
            {/* Header */}
            <div className={styles.resultsHeader}>
              <div aria-live="polite" aria-atomic="true">
                {isLoading || isFetching ? (
                  <span className={styles.resultsMeta}>Searching…</span>
                ) : (
                  <span className={styles.resultsMeta}>
                    {filteredResults.length === 0 ? 'No results' : `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}`}
                    {' for '}<strong>"{query}"</strong>
                  </span>
                )}
              </div>

              {/* Type filter tabs */}
              {allResults.length > 0 && (
                <div className={styles.typeTabs}>
                  <button
                    type="button"
                    className={`${styles.typeTab} ${!typeFilter ? styles.typeTabActive : ''}`}
                    onClick={() => setTypeFilter('')}
                  >
                    All ({allResults.length})
                  </button>
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.typeTab} ${typeFilter === type ? styles.typeTabActive : ''}`}
                      onClick={() => setTypeFilter(type)}
                    >
                      {TYPE_LABELS[type] || type}s ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoading ? (
              <Spinner size="lg" />
            ) : filteredResults.length === 0 ? (
              <div className={styles.noResults}>
                <span aria-hidden="true">🔍</span>
                <h3>No results for "{query}"</h3>
                <p>Try different keywords or browse the resource library.</p>
                <Link to="/resources" className={styles.browseLink}>Browse Resources</Link>
              </div>
            ) : (
              <ul className={styles.resultList}>
                {filteredResults.map((r) => (
                  <li key={`${r.type}-${r.id}`}>
                    <Link to={resultUrl(r)} className={styles.resultItem}>
                      {r.thumbnail && (
                        <div className={styles.resultThumb}>
                          <img src={r.thumbnail} alt="" loading="lazy"
                            onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                        </div>
                      )}
                      <div className={styles.resultInfo}>
                        <div className={styles.resultTopRow}>
                          <span className={`${styles.typeBadge} ${styles[TYPE_STYLES[r.type] || 'typeBlog']}`}>
                            {TYPE_LABELS[r.type] || r.type}
                          </span>
                          {r.access_level === 'free' || r.is_free ? (
                            <span className={styles.freeBadge}>Free</span>
                          ) : r.access_level === 'subscriber' ? (
                            <span className={styles.premiumBadge}>Premium</span>
                          ) : null}
                        </div>
                        <h3 className={styles.resultTitle}>{r.title}</h3>
                        {r.description && (
                          <p className={styles.resultDesc}>{r.description}</p>
                        )}
                      </div>
                      {r.price && (
                        <div className={styles.resultPrice}>
                          {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(r.price)}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
