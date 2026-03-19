// src/pages/Home/Home.jsx
// Hero: HeroCarousel from /api/storefront/slides/
// Sections: Category browser, Featured resources (6), Featured products (4), Latest blog (3)

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaArrowRight } from 'react-icons/fa';

import { getResources, getCategories, getHeroSlides } from '../../api/resources';
import { getProducts }   from '../../api/products';
import { getPosts }      from '../../api/blog';
import HeroCarousel      from '../../components/ui/HeroCarousel/HeroCarousel';
import ResourceCard      from '../../components/cards/ResourceCard';
import ProductCard       from '../../components/cards/ProductCard';
import { formatDate }    from '../../utils/formatDate';
import styles from './Home.module.css';
import SEO from '../../components/seo/SEO';

const CAT_COLOURS = [
  '#3b96f3', '#f59e0b', '#22c55e', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
];

export default function Home() {
  const { data: slides = [], isLoading: slidesLoading } = useQuery({
    queryKey: ['storefront', 'slides'],
    queryFn:  getHeroSlides,
    staleTime: 10 * 60 * 1000,
  });

  const { data: resourceData, isLoading: resLoading } = useQuery({
    queryKey: ['resources', 'featured-home'],
    queryFn:  () => getResources({ is_featured: true, page_size: 6, ordering: '-created_at' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['resources', 'categories'],
    queryFn:  getCategories,
    staleTime: 30 * 60 * 1000,
  });

  const { data: productData, isLoading: prodLoading } = useQuery({
    queryKey: ['products', 'featured-home'],
    queryFn:  () => getProducts({ is_featured: true, page_size: 4, ordering: '-created_at' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: blogData, isLoading: blogLoading } = useQuery({
    queryKey: ['blog', 'home'],
    queryFn:  () => getPosts({ page_size: 3, ordering: '-created_at' }),
    staleTime: 5 * 60 * 1000,
  });

  const resources = resourceData?.results || [];
  const products  = productData?.results  || [];
  const posts     = blogData?.results     || [];
  const rootCats  = categories.slice(0, 8);

  return (
    <div className={styles.homePage}>
      <SEO
        description="Quality teaching resources for Nigerian educators — worksheets, lesson plans, and more. Free to browse."
      />


      {/* ── 1. HERO CAROUSEL ── */}
      <HeroCarousel slides={slides} loading={slidesLoading} />

      {/* ── 2. CATEGORY BROWSER ── */}
      {(catLoading || rootCats.length > 0) && (
        <section className={styles.section}>
          <div className="container">
            <SectionHeader
              title="Browse by Subject"
              subtitle="Find exactly what you need for your class."
              link="/resources"
              linkLabel="All resources"
            />
            <div className={styles.catGrid}>
              {catLoading
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className={`skeleton ${styles.catSkeleton}`} />
                  ))
                : rootCats.map((cat, i) => (
                    <Link
                      key={cat.id}
                      to={`/resources?category__slug=${cat.slug}`}
                      className={styles.catCard}
                      style={{ '--cat-colour': CAT_COLOURS[i % CAT_COLOURS.length] }}
                    >
                      <div className={styles.catIconBg} aria-hidden="true">
                        <span>{cat.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className={styles.catName}>{cat.name}</span>
                      {cat.children?.length > 0 && (
                        <span className={styles.catCount}>
                          {cat.children.length} sub-topic{cat.children.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </Link>
                  ))
              }
            </div>
          </div>
        </section>
      )}

      {/* ── 3. FEATURED RESOURCES ── */}
      <section className={`${styles.section} ${styles.sectionTinted}`}>
        <div className="container">
          <SectionHeader
            title="Featured Resources"
            subtitle="Handpicked for Nigerian primary and secondary classrooms."
            link="/resources"
            linkLabel="View all"
          />
          {resLoading ? (
            <div className={styles.resourceGrid}>
              {[...Array(6)].map((_, i) => <ResourceCard key={i} loading />)}
            </div>
          ) : resources.length === 0 ? (
            <EmptySection message="No featured resources yet." link="/resources" linkLabel="Browse the library" />
          ) : (
            <div className={styles.resourceGrid}>
              {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          )}
          {resources.length > 0 && (
            <div className={styles.sectionCta}>
              <Link to="/resources" className={styles.sectionCtaBtn}>
                Explore All Resources <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. FEATURED PRODUCTS ── */}
      {(prodLoading || products.length > 0) && (
        <section className={styles.section}>
          <div className="container">
            <SectionHeader
              title="From the Shop"
              subtitle="Physical and digital products for educators."
              link="/products"
              linkLabel="Browse shop"
            />
            {prodLoading ? (
              <div className={styles.productGrid}>
                {[...Array(4)].map((_, i) => <ProductCard key={i} loading />)}
              </div>
            ) : (
              <div className={styles.productGrid}>
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 5. LATEST BLOG POSTS ── */}
      {(blogLoading || posts.length > 0) && (
        <section className={`${styles.section} ${styles.sectionTinted}`}>
          <div className="container">
            <SectionHeader
              title="From the Blog"
              subtitle="Ideas and guides for better teaching."
              link="/blog"
              linkLabel="All articles"
            />
            {blogLoading ? (
              <div className={styles.blogGrid}>
                {[...Array(3)].map((_, i) => <BlogCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className={styles.blogGrid}>
                {posts.map((post) => <BlogCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeader({ title, subtitle, link, linkLabel }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className={styles.sectionLink}>
          {linkLabel} <FaArrowRight aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function EmptySection({ message, link, linkLabel }) {
  return (
    <div className={styles.emptySection}>
      <p>
        {message}{' '}
        {link && <Link to={link}>{linkLabel}</Link>}
      </p>
    </div>
  );
}

function BlogCard({ post }) {
  return (
    <article className={styles.blogCard}>
      {post.cover_thumbnail && (
        <Link to={`/blog/${post.slug}`} className={styles.blogCardImgLink} tabIndex={-1} aria-hidden="true">
          <div className={styles.blogCardImg}>
            <img
              src={post.cover_thumbnail}
              alt=""
              loading="lazy"
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
        </Link>
      )}
      <div className={styles.blogCardBody}>
        <div className={styles.blogCardMeta}>
          {post.author_name && <span className={styles.blogCardAuthor}>{post.author_name}</span>}
          <span className={styles.blogCardDate}>{formatDate(post.created_at)}</span>
        </div>
        <h3 className={styles.blogCardTitle}>
          <Link to={`/blog/${post.slug}`} className={styles.blogCardTitleLink}>
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className={styles.blogCardExcerpt}>{post.excerpt}</p>}
        <Link to={`/blog/${post.slug}`} className={styles.blogCardRead}>
          Read article →
        </Link>
      </div>
    </article>
  );
}

function BlogCardSkeleton() {
  return (
    <div className={styles.blogCard} aria-hidden="true">
      <div className={`skeleton ${styles.blogCardImgSkel}`} />
      <div className={styles.blogCardBody}>
        <div className={`skeleton ${styles.skelSm}`} style={{ width: '40%' }} />
        <div className={`skeleton ${styles.skelMd}`} />
        <div className={`skeleton ${styles.skelMd}`} style={{ width: '70%' }} />
        <div className={`skeleton ${styles.skelSm}`} style={{ width: '30%', marginTop: 'var(--space-2)' }} />
      </div>
    </div>
  );
}
