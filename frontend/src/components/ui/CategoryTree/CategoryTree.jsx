// src/components/ui/CategoryTree/CategoryTree.jsx
// Renders the nested MPTT category tree returned by GET /api/categories/
// Root categories collapsed by default, expand on click (per spec).
// Clicking a category filters the resource library.

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import styles from './CategoryTree.module.css';

export default function CategoryTree({ categories = [], loading = false }) {
  if (loading) {
    return (
      <div className={styles.tree} aria-label="Resource categories">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`skeleton ${styles.catSkeleton}`} />
        ))}
      </div>
    );
  }

  return (
    <nav className={styles.tree} aria-label="Resource categories">
      <ul className={styles.rootList} role="tree">
        {categories.map((cat) => (
          <CategoryNode key={cat.id} category={cat} level={0} />
        ))}
      </ul>
    </nav>
  );
}

function CategoryNode({ category, level }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  const hasChildren  = category.children && category.children.length > 0;
  const activeSlug   = searchParams.get('category__slug');
  const isActive     = activeSlug === category.slug;

  const handleSelect = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (isActive) {
      // Clicking the active category deselects it
      next.delete('category__slug');
    } else {
      next.set('category__slug', category.slug);
      next.delete('page'); // reset to page 1 on filter change
    }
    setSearchParams(next);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    setExpanded((p) => !p);
  };

  return (
    <li
      className={styles.node}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      style={{ '--level': level }}
    >
      <div className={`${styles.row} ${isActive ? styles.active : ''}`}>
        {hasChildren && (
          <button
            type="button"
            className={`${styles.expandBtn} ${expanded ? styles.expanded : ''}`}
            onClick={handleToggle}
            aria-label={expanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          >
            <FaChevronRight aria-hidden="true" />
          </button>
        )}
        {!hasChildren && <span className={styles.expandPlaceholder} />}

        <button
          type="button"
          className={styles.label}
          onClick={handleSelect}
          aria-pressed={isActive}
        >
          {category.name}
        </button>
      </div>

      {hasChildren && expanded && (
        <ul className={styles.childList} role="group">
          {category.children.map((child) => (
            <CategoryNode key={child.id} category={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
