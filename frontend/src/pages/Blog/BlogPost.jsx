// src/pages/Blog/BlogPost.jsx
// GET /api/blog/:slug/

import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft, FaCalendarAlt, FaUser } from 'react-icons/fa';

import { getPost }    from '../../api/blog';
import Spinner        from '../../components/ui/Spinner/Spinner';
import { formatDate } from '../../utils/formatDate';
import styles from './Blog.module.css';
import SEO from '../../components/seo/SEO';

export default function BlogPost() {
  const { slug }   = useParams();
  const navigate   = useNavigate();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog', 'detail', slug],
    queryFn:  () => getPost(slug),
    enabled:  Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return (
    <div className={styles.postPage}><div className="container"><Spinner fullPage message="Loading article…" /></div></div>
  );

  if (isError || !post) return (
    <div className={styles.postPage}><div className="container">
      <div className={styles.error} role="alert">Article not found.</div>
      <Link to="/blog" className={styles.backLink}><FaArrowLeft aria-hidden="true" /> Back to Blog</Link>
    </div></div>
  );

  return (
    <div className={styles.postPage}>
      <SEO
        title={post.title}
        description={post.excerpt?.slice(0, 155) || undefined}
        image={post.cover_hero || post.cover_thumbnail || undefined}
        type="article"
      />

      {/* Hero image */}
      {post.cover_hero && (
        <div className={styles.heroWrapper}>
          <img src={post.cover_hero} alt="" className={styles.heroImg}
            onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
          <div className={styles.heroOverlay} aria-hidden="true" />
        </div>
      )}

      <div className="container">
        <div className={styles.postContent}>
          <Link to="/blog" className={styles.backLink}>
            <FaArrowLeft aria-hidden="true" /> Blog
          </Link>

          <header className={styles.postHeader}>
            <h1 className={styles.postHeadTitle}>{post.title}</h1>
            <div className={styles.postHeadMeta}>
              {post.author_name && (
                <span className={styles.postHeadMetaItem}>
                  <FaUser aria-hidden="true" /> {post.author_name}
                </span>
              )}
              <span className={styles.postHeadMetaItem}>
                <FaCalendarAlt aria-hidden="true" /> {formatDate(post.created_at)}
              </span>
              {post.updated_at && post.updated_at !== post.created_at && (
                <span className={styles.postHeadMetaItem}>
                  Updated {formatDate(post.updated_at)}
                </span>
              )}
            </div>
            {post.excerpt && (
              <p className={styles.postLead}>{post.excerpt}</p>
            )}
          </header>

          {/* Sanitised HTML content from the backend (django-bleach already sanitised it) */}
          {post.content && (
            <div
              className={styles.postBody}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
