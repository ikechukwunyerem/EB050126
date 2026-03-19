// src/components/layout/MainMenu/SearchPanel.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import { globalSearch } from '../../../api/search';
import useDebounce from '../../../hooks/useDebounce';
import styles from './MainMenu.module.css';

const TYPE_LABELS = { resource: 'Resource', product: 'Product', blog: 'Blog' };

export default function SearchPanel({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const debounced = useDebounce(query, 400);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    globalSearch(debounced, 8)
      .then((data) => setResults(data.results || []))
      .catch(() => setError('Could not fetch results.'))
      .finally(() => setLoading(false));
  }, [debounced]);

  const handleSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const q = query.trim();
      if (!q) return;
      navigate(`/search?q=${encodeURIComponent(q)}`);
      onClose();
      setQuery('');
      setResults([]);
    }
  };

  // Result URL builder
  const resultUrl = (r) => {
    if (r.type === 'resource') return `/resources/${r.id}`;
    if (r.type === 'product')  return `/products/${r.slug}`;
    if (r.type === 'blog')     return `/blog/${r.slug}`;
    return '/search';
  };

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchInputRow}>
        <div className={styles.searchInputWrapper}>
          <FaSearch className={styles.searchIcon} aria-hidden="true" />
          <input
            id="nav-search"
            type="search"
            placeholder="Search resources, products, blog posts…"
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSubmit}
            autoFocus
            autoComplete="off"
            aria-label="Search Efiko"
          />
        </div>
        <button
          type="button"
          className={styles.searchSubmit}
          onClick={handleSubmit}
          aria-label="Submit search"
        >
          Search
        </button>
      </div>

      {/* Live results */}
      {debounced.trim().length > 1 && (
        <div className={styles.liveResults}>
          {loading && (
            <div className={styles.searchStatus}>
              <FaSpinner className={styles.spinnerIcon} aria-hidden="true" />
              Searching…
            </div>
          )}
          {error && !loading && (
            <div className={`${styles.searchStatus} ${styles.searchError}`}>
              <FaExclamationCircle aria-hidden="true" /> {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className={styles.searchStatus}>
              No results for "<strong>{debounced}</strong>"
            </div>
          )}
          {results.length > 0 && (
            <>
              <ul className={styles.resultList} role="listbox">
                {results.map((r) => (
                  <li key={`${r.type}-${r.id}`} role="option">
                    <Link
                      to={resultUrl(r)}
                      className={styles.resultItem}
                      onClick={() => { onClose(); setQuery(''); setResults([]); }}
                    >
                      <span className={`${styles.resultType} ${styles[`type_${r.type}`]}`}>
                        {TYPE_LABELS[r.type] || r.type}
                      </span>
                      <span className={styles.resultTitle}>{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={styles.viewAll}>
                <button
                  type="button"
                  className={styles.viewAllBtn}
                  onClick={handleSubmit}
                >
                  View all results for "<strong>{query}</strong>"
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
