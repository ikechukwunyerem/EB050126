// src/components/forms/FormField.jsx
import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './FormField.module.css';

/**
 * Labelled input with error state and optional password toggle.
 *
 * @param {string}   id
 * @param {string}   label
 * @param {string}   type         — 'text' | 'email' | 'password' | 'tel'
 * @param {string}   value
 * @param {function} onChange
 * @param {string}   [error]      — validation error message
 * @param {string}   [hint]       — helper text below input
 * @param {boolean}  [required]
 * @param {boolean}  [disabled]
 * @param {string}   [autoComplete]
 * @param {string}   [placeholder]
 */
export default function FormField({
  id,
  label,
  type       = 'text',
  value,
  onChange,
  error,
  hint,
  required   = false,
  disabled   = false,
  autoComplete,
  placeholder,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword   = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>

      <div className={styles.inputWrapper}>
        <input
          id={id}
          name={id}
          type={resolvedType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={styles.input}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            className={styles.togglePassword}
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword
              ? <FaEyeSlash aria-hidden="true" />
              : <FaEye      aria-hidden="true" />
            }
          </button>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
