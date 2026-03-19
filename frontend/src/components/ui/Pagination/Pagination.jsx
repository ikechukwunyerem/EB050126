// src/components/ui/Pagination/Pagination.jsx
// Maps to DRF's { count, next, previous, results } pagination shape.
// Receives current page, total count, page size, and an onPageChange callback.

import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './Pagination.module.css';

/**
 * @param {number}   count       — total result count from API
 * @param {number}   page        — current page (1-indexed)
 * @param {number}   pageSize    — items per page
 * @param {function} onPageChange — (newPage: number) => void
 */
export default function Pagination({ count, page, pageSize = 12, onPageChange }) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Build page number window: always show first, last, current ±1, with ellipsis
  const pages = buildPageList(page, totalPages);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        className={styles.navBtn}
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        aria-label="Previous page"
      >
        <FaChevronLeft aria-hidden="true" />
      </button>

      <ol className={styles.pageList}>
        {pages.map((p, i) =>
          p === '...' ? (
            <li key={`ellipsis-${i}`} className={styles.ellipsis} aria-hidden="true">…</li>
          ) : (
            <li key={p}>
              <button
                className={`${styles.pageBtn} ${p === page ? styles.active : ''}`}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ol>

      <button
        className={styles.navBtn}
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        aria-label="Next page"
      >
        <FaChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current]);
  if (current > 1)     pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }

  return result;
}
