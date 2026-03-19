// src/pages/Resources/ResourceLibrary.jsx
// GET /api/resources/?page=&category__slug=&resource_type=&access_level=&search=&ordering=
// Sidebar on desktop, collapsible drawer on mobile. 12 per page.
// All filters are URL-param driven for shareability and back-button support.

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaFilter, FaTimes, FaSearch, FaChevronDown } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

import { getResources } from '../../api/resources';
import { useCategories } from '../../hooks/useResources';
import ResourceCard  from '../../components/cards/ResourceCard';
import CategoryTree  from '../../components/ui/CategoryTree/CategoryTree';
import Pagination    from '../../components/ui/Pagination/Pagination';
import Spinner       from '../../components/ui/Spinner/Spinner';
import useDebounce   from '../../hooks/useDebounce';
import styles from './ResourceLibrary.module.css';
import SEO from '../../components/seo/SEO';

const PAGE_SIZE = 12;

const RESOURCE_TYPES = [
  { value: '',             label: 'All Types'      },
  { value: 'worksheet',    label: 'Worksheets'     },
  { value: 'lesson_plan',  label: 'Lesson Plans'   },
  { value: 'activity',     label: 'Activities'     },
  { value: 'assessment',   label: 'Assessments'    },
  { value: 'scheme',       label: 'Schemes of Work' },
  { value: 'presentation', label: 'Presentations'  },
  { value: 'flashcard',    label: 'Flashcards'     },
];

const ACCESS_LEVELS = [
  { value: '',           label: 'All Resources' },
  { value: 'free',       label: 'Free Only'     },
  { value: 'subscriber', label: 'Premium Only'  },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at',  label: 'Oldest first' },
  { value: 'title',       label: 'A \u2013 Z'   },
  { value: '-title',      label: 'Z \u2013 A'   },
];

export default function ResourceLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen,  setDrawerOpen]    = useState(false);
  const [searchInput, setSearchInput]   = useState(
    searchParams.get('search') || ''
  );

  const page         = parseInt(searchParams.get('page')          || '1', 10);
  const categorySlug = searchParams.get('category__slug')         || '';
  const resourceType = searchParams.get('resource_type')          || '';
  const accessLevel  = searchParams.get('access_level')           || '';
  const ordering     = searchParams.get('ordering')               || '-created_at';
  const search       = searchParams.get('search')                 || '';

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch === search) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) { next.set('search', debouncedSearch); }
    else                 { next.delete('search'); }
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const apiParams = {
    page,
    page_size: PAGE_SIZE,
    ...(categorySlug && { category__slug: categorySlug }),
    ...(resourceType  && { resource_type: resourceType  }),
    ...(accessLevel   && { access_level:  accessLevel   }),
    ...(ordering      && { ordering                     }),
    ...(search        && { search                       }),
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey:         ['resources', 'list', apiParams],
    queryFn:          () => getResources(apiParams),
    keepPreviousData: true,
    staleTime:        2 * 60 * 1000,
  });

  const { data: categories, isLoading: catsLoading } = useCategories();

  const resources  = data?.results || [];
  const totalCount = data?.count   || 0;
  const hasFilters = Boolean(categorySlug || resourceType || accessLevel || search);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) { next.set(key, value); } else { next.delete(key); }
    next.delete('page');
    setSearchParams(next);
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({ ordering }));
  };

  const handlePageChange = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const FiltersPane = (
    <div className={styles.filtersPane}>
      <div className={styles.filterSection}>
        <h3 className={styles.filterHeading}>Categories</h3>
        <CategoryTree categories={categories || []} loading={catsLoading} />
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterHeading}>Resource Type</h3>
        <div className={styles.chipGroup}>
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`${styles.chip} ${resourceType === t.value ? styles.chipActive : ''}`}
              onClick={() => setParam('resource_type', t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterHeading}>Access Level</h3>
        <div className={styles.chipGroup}>
          {ACCESS_LEVELS.map((a) => (
            <button
              key={a.value}
              type="button"
              className={`${styles.chip} ${accessLevel === a.value ? styles.chipActive : ''}`}
              onClick={() => setParam('access_level', a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button type="button" className={styles.clearBtn} onClick={clearAll}>
          <FaTimes aria-hidden="true" /> Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <SEO
        title="Resource Library"
        description="Browse thousands of worksheets, lesson plans, and educational resources for Nigerian primary and secondary schools."
      />

      <div className="container">

        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Resource Library</h1>
          <p className={styles.pageSubtitle}>
            Printable and digital teaching materials built for Nigerian classrooms.
          </p>
        </header>

        <div className={styles.layout}>

          {/* ── Desktop sidebar ── */}
          <aside className={styles.sidebar} aria-label="Filter resources">
            {FiltersPane}
          </aside>

          {/* ── Main ── */}
          <section className={styles.main}>

            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <FaSearch className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search resources…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search resources"
                />
                {searchInput && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setSearchInput('')}
                    aria-label="Clear search"
                  >
                    <FaTimes aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className={styles.sortBox}>
                <select
                  className={styles.sortSelect}
                  value={ordering}
                  onChange={(e) => setParam('ordering', e.target.value)}
                  aria-label="Sort resources"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <FaChevronDown className={styles.sortArrow} aria-hidden="true" />
              </div>

              {/* Mobile filter button */}
              <button
                type="button"
                className={styles.mobileFilterBtn}
                onClick={() => setDrawerOpen(true)}
                aria-expanded={drawerOpen}
              >
                <FaFilter aria-hidden="true" />
                Filters
                {hasFilters && <span className={styles.filterDot} aria-label="Filters active" />}
              </button>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className={styles.activeFilters} aria-label="Active filters">
                {categorySlug && (
                  <FilterChip label={`Category: ${categorySlug}`} onRemove={() => setParam('category__slug', '')} />
                )}
                {resourceType && (
                  <FilterChip
                    label={RESOURCE_TYPES.find((t) => t.value === resourceType)?.label || resourceType}
                    onRemove={() => setParam('resource_type', '')}
                  />
                )}
                {accessLevel && (
                  <FilterChip
                    label={ACCESS_LEVELS.find((a) => a.value === accessLevel)?.label || accessLevel}
                    onRemove={() => setParam('access_level', '')}
                  />
                )}
                {search && (
                  <FilterChip
                    label={`"${search}"`}
                    onRemove={() => { setSearchInput(''); setParam('search', ''); }}
                  />
                )}
              </div>
            )}

            {/* Result count */}
            <div className={styles.resultsMeta} aria-live="polite" aria-atomic="true">
              {!isLoading && !isError && (
                <span className={styles.resultsCount}>
                  {totalCount === 0 ? 'No resources found'
                    : `${totalCount.toLocaleString()} resource${totalCount !== 1 ? 's' : ''}`}
                </span>
              )}
              {isFetching && !isLoading && (
                <span className={styles.fetching}><Spinner size="sm" /></span>
              )}
            </div>

            {/* Error */}
            {isError && (
              <div className={styles.errorBanner} role="alert">
                Failed to load resources. Check your connection and try again.
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className={styles.grid} aria-busy="true" aria-label="Loading resources">
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <ResourceCard key={i} loading />
                ))}
              </div>
            ) : resources.length === 0 && !isError ? (
              <EmptyState hasFilters={hasFilters} onClear={clearAll} />
            ) : (
              <div className={styles.grid}>
                {resources.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <Pagination
                count={totalCount}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
              />
            )}
          </section>
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {drawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
          role="presentation"
        >
          <div className={styles.drawer} role="dialog" aria-label="Filters" aria-modal="true">
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Filters</h2>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
            <div className={styles.drawerBody}>{FiltersPane}</div>
            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={styles.drawerApply}
                onClick={() => setDrawerOpen(false)}
              >
                {totalCount === 0 ? 'No results' : `Show ${totalCount.toLocaleString()} result${totalCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className={styles.filterChip}>
      {label}
      <button type="button" className={styles.filterChipRemove} onClick={onRemove} aria-label={`Remove filter: ${label}`}>
        <FaTimes aria-hidden="true" />
      </button>
    </span>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyEmoji} aria-hidden="true">📚</span>
      <h3 className={styles.emptyTitle}>No resources found</h3>
      <p className={styles.emptyText}>
        {hasFilters
          ? 'Try adjusting your filters or search term.'
          : 'No resources are published yet. Check back soon.'}
      </p>
      {hasFilters && (
        <button type="button" className={styles.emptyClear} onClick={onClear}>
          Clear all filters
        </button>
      )}
    </div>
  );
}
