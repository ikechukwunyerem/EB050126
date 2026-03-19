// src/components/ui/HeroCarousel/HeroCarousel.jsx
// Displays slides from GET /api/storefront/slides/
// Each slide: { id, title, subtitle, image, link, btn_text }
// Auto-advances every 5s. Pauses on hover. Keyboard accessible.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './HeroCarousel.module.css';

export default function HeroCarousel({ slides = [], loading = false }) {
  const [current,   setCurrent]   = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [animDir,   setAnimDir]   = useState('next'); // 'next' | 'prev'
  const intervalRef = useRef(null);
  const trackRef    = useRef(null);

  const count = slides.length;

  const goTo = useCallback((index, dir = 'next') => {
    setAnimDir(dir);
    setCurrent((index + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(current + 1, 'next'), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, 'prev'), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    intervalRef.current = setInterval(next, 5000);
    return () => clearInterval(intervalRef.current);
  }, [count, paused, next]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={styles.carousel} aria-busy="true" aria-label="Loading hero">
        <div className={`skeleton ${styles.skeletonSlide}`} />
      </div>
    );
  }

  // No slides — render nothing (parent will show fallback)
  if (count === 0) return null;

  const slide = slides[current];

  return (
    <section
      className={styles.carousel}
      aria-label="Featured content carousel"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Slides */}
      <div
        ref={trackRef}
        className={`${styles.slide} ${styles[`anim_${animDir}`]}`}
        key={current}
        role="group"
        aria-roledescription="slide"
        aria-label={`Slide ${current + 1} of ${count}: ${slide.title}`}
      >
        {/* Background image */}
        {slide.image && (
          <img
            src={slide.image}
            alt=""
            className={styles.slideImg}
            loading={current === 0 ? 'eager' : 'lazy'}
          />
        )}
        {/* Gradient overlay for legibility */}
        <div className={styles.overlay} aria-hidden="true" />

        {/* Content */}
        <div className={`container ${styles.slideContent}`}>
          <div className={styles.slideText}>
            {slide.title && (
              <h1 className={styles.slideTitle}>{slide.title}</h1>
            )}
            {slide.subtitle && (
              <p className={styles.slideSubtitle}>{slide.subtitle}</p>
            )}
            {slide.link && slide.btn_text && (
              <Link
                to={slide.link}
                className={styles.slideCta}
              >
                {slide.btn_text}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Prev / Next buttons — only show if more than one slide */}
      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnPrev}`}
            onClick={prev}
            aria-label="Previous slide"
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnNext}`}
            onClick={next}
            aria-label="Next slide"
          >
            <FaChevronRight aria-hidden="true" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className={styles.dots} role="tablist" aria-label="Slide indicators">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => goTo(i, i > current ? 'next' : 'prev')}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {count > 1 && !paused && (
        <div className={styles.progressTrack} aria-hidden="true">
          <div key={current} className={styles.progressBar} />
        </div>
      )}
    </section>
  );
}
