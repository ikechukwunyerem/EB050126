// src/components/ui/StarRating/StarRating.jsx
import React, { useState } from 'react';
import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import styles from './StarRating.module.css';

/**
 * Read-only display mode: pass only `rating` and optionally `count`.
 * Interactive mode: pass `interactive={true}` and `onRate` callback.
 *
 * @param {number}   rating      — current average or selected rating
 * @param {number}   [count]     — number of ratings (shows in display mode)
 * @param {boolean}  [interactive] — enables click-to-rate
 * @param {function} [onRate]    — (score: 1-5) => void
 * @param {'sm'|'md'|'lg'} [size]
 */
export default function StarRating({
  rating  = 0,
  count,
  interactive = false,
  onRate,
  size = 'md',
}) {
  const [hovered, setHovered] = useState(0);
  const displayRating = interactive && hovered ? hovered : rating;

  return (
    <div className={`${styles.starRating} ${styles[size]}`}>
      <div
        className={`${styles.stars} ${interactive ? styles.interactive : ''}`}
        role={interactive ? 'group' : 'img'}
        aria-label={`${rating.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled  = displayRating >= star;
          const half    = !filled && displayRating >= star - 0.5;
          const Icon    = filled ? FaStar : half ? FaStarHalfAlt : FaRegStar;

          return (
            <button
              key={star}
              type="button"
              className={`${styles.star} ${filled || half ? styles.active : ''}`}
              onClick={interactive ? () => onRate?.(star) : undefined}
              onMouseEnter={interactive ? () => setHovered(star) : undefined}
              onMouseLeave={interactive ? () => setHovered(0)    : undefined}
              disabled={!interactive}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {typeof count === 'number' && (
        <span className={styles.count}>
          {rating.toFixed(1)}
          <span className={styles.countNum}>({count.toLocaleString()})</span>
        </span>
      )}
    </div>
  );
}
