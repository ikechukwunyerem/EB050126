// src/components/ui/EmptyState/EmptyState.jsx
// Consistent zero-data UI used when lists have no items.
//
// Usage:
//   <EmptyState
//     emoji="📚"
//     title="No resources yet"
//     message="Resources you bookmark will appear here."
//     action={{ label: 'Browse Library', href: '/resources' }}
//   />

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';

/**
 * @param {string}   emoji
 * @param {string}   title
 * @param {string}   [message]
 * @param {{ label: string, href?: string, onClick?: fn }} [action]   — primary CTA
 * @param {{ label: string, href?: string, onClick?: fn }} [secondary] — secondary link
 * @param {'sm'|'md'|'lg'} [size]
 */
export default function EmptyState({
  emoji    = '🔍',
  title,
  message,
  action,
  secondary,
  size     = 'md',
}) {
  return (
    <div className={`${styles.empty} ${styles[size]}`} role="status">
      {emoji && (
        <div className={styles.emoji} aria-hidden="true">{emoji}</div>
      )}
      {title && (
        <h3 className={styles.title}>{title}</h3>
      )}
      {message && (
        <p className={styles.message}>{message}</p>
      )}
      {(action || secondary) && (
        <div className={styles.actions}>
          {action && (
            action.href
              ? <Link to={action.href} className={styles.actionBtn}>{action.label}</Link>
              : <button type="button" className={styles.actionBtn} onClick={action.onClick}>{action.label}</button>
          )}
          {secondary && (
            secondary.href
              ? <Link to={secondary.href} className={styles.secondaryLink}>{secondary.label}</Link>
              : <button type="button" className={styles.secondaryLink} onClick={secondary.onClick}>{secondary.label}</button>
          )}
        </div>
      )}
    </div>
  );
}
