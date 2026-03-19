// src/components/ui/Modal/Modal.jsx
import React, { useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from './Modal.module.css';

/**
 * Accessible modal dialog.
 *
 * @param {boolean}   isOpen
 * @param {function}  onClose
 * @param {string}    title
 * @param {ReactNode} children
 * @param {string}    [size='md']  — 'sm' | 'md' | 'lg'
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the dialog for keyboard users
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex="-1"
      >
        <div className={styles.header}>
          {title && (
            <h2 id="modal-title" className={styles.title}>{title}</h2>
          )}
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}
