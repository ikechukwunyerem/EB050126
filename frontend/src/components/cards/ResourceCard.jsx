// src/components/cards/ResourceCard.jsx
// Used in the Resource Library grid and anywhere a resource is listed.
// Handles three states: loading (skeleton), loaded, and error (fallback image).

import React from 'react';
import { Link } from 'react-router-dom';
import { FaLock, FaDownload, FaBookmark } from 'react-icons/fa';
import styles from './ResourceCard.module.css';

// Map backend resource_type values to display labels
const TYPE_LABELS = {
  worksheet:    'Worksheet',
  lesson_plan:  'Lesson Plan',
  activity:     'Activity',
  assessment:   'Assessment',
  scheme:       'Scheme of Work',
  presentation: 'Presentation',
  flashcard:    'Flashcard',
  other:        'Resource',
};

const TYPE_COLOURS = {
  worksheet:    'typeBlue',
  lesson_plan:  'typeGreen',
  activity:     'typeOrange',
  assessment:   'typePurple',
  scheme:       'typeTeal',
  presentation: 'typeRed',
  flashcard:    'typeYellow',
  other:        'typeGrey',
};

export default function ResourceCard({ resource, loading = false }) {
  // ── Skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.card} aria-hidden="true">
        <div className={`skeleton ${styles.imgSkeleton}`} />
        <div className={styles.body}>
          <div className={`skeleton ${styles.badgeSkeleton}`} />
          <div className={`skeleton ${styles.titleSkeleton}`} />
          <div className={`skeleton ${styles.titleSkeletonShort}`} />
          <div className={`skeleton ${styles.metaSkeleton}`} />
        </div>
      </div>
    );
  }

  if (!resource) return null;

  const {
    id,
    title,
    slug,
    description,
    resource_type,
    access_level,
    is_free,
    is_featured,
    thumbnail_card,
    category,
  } = resource;

  const isFree        = is_free || access_level === 'free';
  const typeLabel     = TYPE_LABELS[resource_type]  || 'Resource';
  const typeColour    = TYPE_COLOURS[resource_type] || 'typeGrey';
  const href          = `/resources/${id}`;

  return (
    <article className={`${styles.card} ${is_featured ? styles.featured : ''}`}>
      {/* Thumbnail */}
      <Link to={href} className={styles.imgLink} tabIndex={-1} aria-hidden="true">
        <div className={styles.imgWrapper}>
          {thumbnail_card ? (
            <img
              src={thumbnail_card}
              alt=""
              className={styles.img}
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/resource-placeholder.png';
              }}
            />
          ) : (
            <div className={styles.imgPlaceholder}>
              <FaDownload aria-hidden="true" />
            </div>
          )}
          {/* Access overlay badge */}
          {!isFree && (
            <div className={styles.lockedOverlay} aria-label="Subscriber only">
              <FaLock aria-hidden="true" />
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className={styles.body}>
        {/* Badges row */}
        <div className={styles.badges}>
          <span className={`${styles.typeBadge} ${styles[typeColour]}`}>
            {typeLabel}
          </span>
          {isFree ? (
            <span className={styles.freeBadge}>Free</span>
          ) : (
            <span className={styles.premiumBadge}>
              <FaLock aria-hidden="true" /> Premium
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={styles.title}>
          <Link to={href} className={styles.titleLink}>
            {title}
          </Link>
        </h3>

        {/* Description */}
        {description && (
          <p className={styles.description}>
            {description.length > 100
              ? `${description.slice(0, 100)}…`
              : description}
          </p>
        )}

        {/* Category */}
        {category && (
          <div className={styles.meta}>
            <Link
              to={`/resources?category__slug=${category.slug}`}
              className={styles.categoryLink}
            >
              {category.name}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
