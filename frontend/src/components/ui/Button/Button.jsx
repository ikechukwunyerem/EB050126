// src/components/ui/Button/Button.jsx
import React from 'react';
import styles from './Button.module.css';

/**
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'} [variant='primary']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean} [fullWidth]
 * @param {boolean} [isLoading]
 * @param {boolean} [disabled]
 * @param {ReactNode} [leftIcon]
 * @param {ReactNode} [rightIcon]
 */
export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  fullWidth = false,
  isLoading = false,
  disabled  = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth  ? styles.fullWidth  : '',
        isLoading  ? styles.loading    : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {isLoading && (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      {!isLoading && leftIcon && (
        <span className={styles.iconLeft} aria-hidden="true">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className={styles.iconRight} aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
}
