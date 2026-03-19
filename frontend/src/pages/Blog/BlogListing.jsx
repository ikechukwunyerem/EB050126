// src/pages/Blog/BlogListing.jsx
// GET /api/blog/?page=&search=&ordering=

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaSearch } from 'react-icons/fa';

import { getPosts }    from '../../api/blog';
import Pagination      from '../../components/ui/Pagination/Pagination';
import Spinner         from '../../components/ui/Spinner/Spinner';
import useDebounce     from '../../hooks/useDebounce';
import { formatDate }  from '../../utils/formatDate';
import styles from './Blog.module.css';
import SEO from '../../components/seo/SEO';

const PAGE_SIZE = 9;

export default function BlogListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput]   = useState(searchParams.get('search') || '');

  const page    = parseInt(searchParams.get('page') || '1', 10);
  const search  = searchParams.get('search') || '';
  const dSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    if (dSearch === search) return;
    const next = new URLSearchParams(searchParams);
    dSearch ? next.set('search', dSearch) : next.delete('search');
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [dSearch]); // eslint-disable-line

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog', 'list', { page, search }],
    queryFn:  () => getPosts({ page, page_size: PAGE_SIZE, ...(search && { search }) }),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const posts = data?.results || [];
  const total = data?.count   || 0;

  const handlePage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Blog"
        description="Teaching ideas, guides, and classroom strategies from the Efiko team."
      />

      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>Ideas, guides, and resources for Nigerian educators.</p>
        </header>

        {/* Search */}
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search articles…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search blog"
            />
          </div>
          {!isLoading && (
            <span className={styles.count}>
              {total === 0 ? 'No articles found' : `${total.toLocaleString()} article${total !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className={styles.grid}>
            {[...Array(PAGE_SIZE)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className={styles.error} role="alert">Failed to load posts. Please try again.</div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">✍️</span>
            <h3>No articles found</h3>
            {search && <p>Try a different search term.</p>}
          </div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post, index) => (
              <PostCard key={post.id} post={post} featured={index === 0 && page === 1 && !search} />
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

function PostCard({ post, featured }) {
  return (
    <article className={`${styles.postCard} ${featured ? styles.postCardFeatured : ''}`}>
      {post.cover_thumbnail && (
        <Link to={`/blog/${post.slug}`} className={styles.postImgLink} tabIndex={-1} aria-hidden="true">
          <div className={styles.postImgWrapper}>
            <img
              src={post.cover_thumbnail}
              alt=""
              className={styles.postImg}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </Link>
      )}
      <div className={styles.postBody}>
        <div className={styles.postMeta}>
          {post.author_name && <span className={styles.postAuthor}>{post.author_name}</span>}
          <span className={styles.postDate}>{formatDate(post.created_at)}</span>
        </div>
        <h2 className={styles.postTitle}>
          <Link to={`/blog/${post.slug}`} className={styles.postTitleLink}>{post.title}</Link>
        </h2>
        {post.excerpt && (
          <p className={styles.postExcerpt}>{post.excerpt}</p>
        )}
        <Link to={`/blog/${post.slug}`} className={styles.readMore}>
          Read article →
        </Link>
      </div>
    </article>
  );
}

function PostCardSkeleton() {
  return (
    <div className={styles.postCard} aria-hidden="true">
      <div className={`skeleton ${styles.postImgSkeleton}`} />
      <div className={styles.postBody}>
        <div className={`skeleton ${styles.skelMeta}`} />
        <div className={`skeleton ${styles.skelTitle}`} />
        <div className={`skeleton ${styles.skelTitle}`} style={{ width: '70%' }} />
        <div className={`skeleton ${styles.skelExcerpt}`} />
      </div>
    </div>
  );
}
