// src/components/ui/Spinner/Spinner.jsx
import React from 'react';
import styles from './Spinner.module.css';

/**
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean}        [fullPage]  — centres in the viewport
 * @param {string}         [message]   — optional text below spinner
 */
export default function Spinner({ size = 'md', fullPage = false, message }) {
  const spinner = (
    <div className={styles.wrapper} role="status" aria-label={message || 'Loading'}>
      <div className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className={styles.fullPage}>{spinner}</div>;
  }

  return spinner;
}
