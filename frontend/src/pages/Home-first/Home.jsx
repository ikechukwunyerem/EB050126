// src/pages/Home/Home.jsx
// Sections (in order):
//  1. Hero — gradient mesh, headline, CTAs, stats bar
//  2. Category browser — visual grid from /api/categories/
//  3. Featured resources — 6 cards from /api/resources/?is_featured=true
//  4. Subscription teaser — pricing nudge
//  5. Featured products — 4 cards from /api/products/?is_featured=true
//  6. Latest blog posts — 3 cards from /api/blog/

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FaArrowRight, FaBookOpen, FaDownload,
  FaUsers, FaStar, FaCrown,
} from 'react-icons/fa';

import { getResources, getCategories } from '../../api/resources';
import { getProducts }                 from '../../api/products';
import { getPosts }                    from '../../api/blog';
import { useAuthStore }                from '../../store/authStore';
import ResourceCard from '../../components/cards/ResourceCard';
import ProductCard  from '../../components/cards/ProductCard';
import { formatDate } from '../../utils/formatDate';
import styles from './Home.module.css';

// Category colour palette — cycles through these for visual interest
const CAT_COLOURS = [
  '#3b96f3', '#f59e0b', '#22c55e', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
];

export default function Home() {
  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn());
  const user        = useAuthStore((s) => s.user);

  // All data fetches — staggered staleTime so they don't all refetch together
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

  const resources  = resourceData?.results || [];
  const products   = productData?.results  || [];
  const posts      = blogData?.results     || [];
  const rootCats   = categories.slice(0, 8); // show up to 8 root categories

  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || null;

  return (
    <div className={styles.homePage}>

      {/* ═══════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════ */}
      <section className={styles.hero} aria-label="Welcome to Efiko">
        {/* Decorative background elements */}
        <div className={styles.heroMesh} aria-hidden="true" />
        <div className={styles.heroOrb1} aria-hidden="true" />
        <div className={styles.heroOrb2} aria-hidden="true" />
        <div className={styles.heroOrb3} aria-hidden="true" />
        <div className={styles.heroDots} aria-hidden="true" />

        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>

            {/* Personalised greeting for logged-in users */}
            {isLoggedIn && firstName && (
              <div className={styles.heroGreeting}>
                <span className={styles.heroGreetingDot} aria-hidden="true" />
                Welcome back, {firstName}
              </div>
            )}

            {!isLoggedIn && (
              <div className={styles.heroEyebrow}>
                <span className={styles.heroEyebrowIcon} aria-hidden="true">🇳🇬</span>
                Built for Nigerian classrooms
              </div>
            )}

            <h1 className={styles.heroHeadline}>
              Teaching resources
              <span className={styles.heroHeadlineAccent}> that actually</span>
              <br />
              <span className={styles.heroHeadlineUnderline}>work in Nigeria.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Thousands of worksheets, lesson plans, and assessments — 
              aligned to the Nigerian curriculum and ready to print or share digitally.
            </p>

            <div className={styles.heroCtas}>
              <Link to="/resources" className={styles.heroCtaPrimary}>
                <FaBookOpen aria-hidden="true" />
                Browse Resources
                <FaArrowRight className={styles.ctaArrow} aria-hidden="true" />
              </Link>
              {!isLoggedIn && (
                <Link to="/register" className={styles.heroCtaSecondary}>
                  Sign Up Free
                </Link>
              )}
              {isLoggedIn && (
                <Link to="/pricing" className={styles.heroCtaSecondary}>
                  <FaCrown aria-hidden="true" /> View Plans
                </Link>
              )}
            </div>

          </div>

          {/* Hero visual — abstract stacked cards */}
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroCard} style={{ '--delay': '0s' }}>
              <div className={styles.heroCardBar} style={{ width: '70%', background: 'var(--color-primary-300)' }} />
              <div className={styles.heroCardBar} style={{ width: '50%', background: 'var(--color-neutral-200)' }} />
              <div className={styles.heroCardBar} style={{ width: '85%', background: 'var(--color-neutral-200)' }} />
              <div className={styles.heroCardTag} style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>Worksheet</div>
            </div>
            <div className={styles.heroCard} style={{ '--delay': '0.1s' }}>
              <div className={styles.heroCardBar} style={{ width: '60%', background: 'var(--color-accent-300)' }} />
              <div className={styles.heroCardBar} style={{ width: '75%', background: 'var(--color-neutral-200)' }} />
              <div className={styles.heroCardBar} style={{ width: '45%', background: 'var(--color-neutral-200)' }} />
              <div className={styles.heroCardTag} style={{ background: 'var(--color-success-100)', color: 'var(--color-success-700)' }}>Lesson Plan</div>
            </div>
            <div className={styles.heroCard} style={{ '--delay': '0.2s' }}>
              <div className={styles.heroCardBar} style={{ width: '80%', background: '#c4b5fd' }} />
              <div className={styles.heroCardBar} style={{ width: '55%', background: 'var(--color-neutral-200)' }} />
              <div className={styles.heroCardBar} style={{ width: '90%', background: 'var(--color-neutral-200)' }} />
              <div className={styles.heroCardTag} style={{ background: '#f3e8ff', color: '#6b21a8' }}>Assessment</div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <div className="container">
            <div className={styles.statsInner}>
              <div className={styles.stat}>
                <FaDownload className={styles.statIcon} aria-hidden="true" />
                <span className={styles.statNum}>10,000+</span>
                <span className={styles.statLabel}>Resources</span>
              </div>
              <div className={styles.statDivider} aria-hidden="true" />
              <div className={styles.stat}>
                <FaUsers className={styles.statIcon} aria-hidden="true" />
                <span className={styles.statNum}>50,000+</span>
                <span className={styles.statLabel}>Educators</span>
              </div>
              <div className={styles.statDivider} aria-hidden="true" />
              <div className={styles.stat}>
                <FaStar className={styles.statIcon} aria-hidden="true" />
                <span className={styles.statNum}>4.8 / 5</span>
                <span className={styles.statLabel}>Average rating</span>
              </div>
              <div className={styles.statDivider} aria-hidden="true" />
              <div className={styles.stat}>
                <FaBookOpen className={styles.statIcon} aria-hidden="true" />
                <span className={styles.statNum}>Free</span>
                <span className={styles.statLabel}>To browse</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          2. CATEGORY BROWSER
      ═══════════════════════════════════════ */}
      {(catLoading || rootCats.length > 0) && (
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Browse by Subject</h2>
                <p className={styles.sectionSubtitle}>Find exactly what you need for your class.</p>
              </div>
              <Link to="/resources" className={styles.sectionLink}>
                All categories <FaArrowRight aria-hidden="true" />
              </Link>
            </div>

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

      {/* ═══════════════════════════════════════
          3. FEATURED RESOURCES
      ═══════════════════════════════════════ */}
      <section className={`${styles.section} ${styles.sectionTinted}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Featured Resources</h2>
              <p className={styles.sectionSubtitle}>Handpicked for Nigerian primary and secondary classrooms.</p>
            </div>
            <Link to="/resources" className={styles.sectionLink}>
              View all <FaArrowRight aria-hidden="true" />
            </Link>
          </div>

          {resLoading ? (
            <div className={styles.resourceGrid}>
              {[...Array(6)].map((_, i) => <ResourceCard key={i} loading />)}
            </div>
          ) : resources.length === 0 ? (
            <div className={styles.emptySection}>
              <p>No featured resources yet — <Link to="/resources">browse the full library</Link>.</p>
            </div>
          ) : (
            <div className={styles.resourceGrid}>
              {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          )}

          <div className={styles.sectionCta}>
            <Link to="/resources" className={styles.sectionCtaBtn}>
              Explore All Resources <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          4. SUBSCRIPTION TEASER
      ═══════════════════════════════════════ */}
      <section className={styles.pricingTeaser} aria-label="Subscription plans">
        <div className={styles.pricingTeaserMesh} aria-hidden="true" />
        <div className="container">
          <div className={styles.pricingTeaserInner}>
            <div className={styles.pricingTeaserText}>
              <div className={styles.pricingTeaserEyebrow}>
                <FaCrown aria-hidden="true" /> Premium Access
              </div>
              <h2 className={styles.pricingTeaserTitle}>
                Unlock every resource.<br />One simple subscription.
              </h2>
              <p className={styles.pricingTeaserSubtitle}>
                Subscribe and get unlimited downloads of all premium worksheets,
                lesson plans, and assessments. Cancel anytime.
              </p>
              <div className={styles.pricingTeaserBullets}>
                {[
                  'Unlimited resource downloads',
                  'New content added every week',
                  'All subjects and year groups',
                  'Printable and digital formats',
                ].map((b) => (
                  <div key={b} className={styles.pricingTeaserBullet}>
                    <span className={styles.bulletCheck} aria-hidden="true">✓</span> {b}
                  </div>
                ))}
              </div>
              <div className={styles.pricingTeaserActions}>
                <Link to="/pricing" className={styles.pricingTeaserCta}>
                  See Pricing Plans <FaArrowRight aria-hidden="true" />
                </Link>
                <Link to="/resources?access_level=free" className={styles.pricingTeaserGhost}>
                  Browse free resources
                </Link>
              </div>
            </div>
            <div className={styles.pricingTeaserVisual} aria-hidden="true">
              <div className={styles.pricingTeaserCard}>
                <div className={styles.ptcHeader}>
                  <FaCrown className={styles.ptcCrown} />
                  <span>Premium</span>
                </div>
                <div className={styles.ptcPrice}>
                  <span className={styles.ptcCurrency}>₦</span>
                  <span className={styles.ptcAmount}>2,500</span>
                  <span className={styles.ptcPeriod}>/mo</span>
                </div>
                <div className={styles.ptcDivider} />
                {['All resources', 'Unlimited downloads', 'Cancel anytime'].map((f) => (
                  <div key={f} className={styles.ptcFeature}>
                    <span className={styles.ptcCheck}>✓</span> {f}
                  </div>
                ))}
                <div className={styles.ptcButton}>Get Started</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          5. FEATURED PRODUCTS
      ═══════════════════════════════════════ */}
      {(prodLoading || products.length > 0) && (
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>From the Shop</h2>
                <p className={styles.sectionSubtitle}>Physical and digital products for educators.</p>
              </div>
              <Link to="/products" className={styles.sectionLink}>
                Browse shop <FaArrowRight aria-hidden="true" />
              </Link>
            </div>

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

      {/* ═══════════════════════════════════════
          6. LATEST BLOG POSTS
      ═══════════════════════════════════════ */}
      {(blogLoading || posts.length > 0) && (
        <section className={`${styles.section} ${styles.sectionTinted}`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>From the Blog</h2>
                <p className={styles.sectionSubtitle}>Ideas and guides for better teaching.</p>
              </div>
              <Link to="/blog" className={styles.sectionLink}>
                All articles <FaArrowRight aria-hidden="true" />
              </Link>
            </div>

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

      {/* ═══════════════════════════════════════
          FOOTER CTA BAND
      ═══════════════════════════════════════ */}
      {!isLoggedIn && (
        <section className={styles.ctaBand}>
          <div className="container">
            <div className={styles.ctaBandInner}>
              <h2 className={styles.ctaBandTitle}>
                Ready to transform your classroom?
              </h2>
              <p className={styles.ctaBandSubtitle}>
                Join over 50,000 Nigerian educators using Efiko every week.
              </p>
              <div className={styles.ctaBandActions}>
                <Link to="/register" className={styles.ctaBandPrimary}>
                  Create Free Account
                </Link>
                <Link to="/resources" className={styles.ctaBandSecondary}>
                  Browse First
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// ── Mini blog card ────────────────────────────────────────────────────────────
function BlogCard({ post }) {
  return (
    <article className={styles.blogCard}>
      {post.cover_thumbnail && (
        <Link to={`/blog/${post.slug}`} className={styles.blogCardImgLink} tabIndex={-1} aria-hidden="true">
          <div className={styles.blogCardImg}>
            <img src={post.cover_thumbnail} alt=""
              loading="lazy"
              onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
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
        {post.excerpt && (
          <p className={styles.blogCardExcerpt}>{post.excerpt}</p>
        )}
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
