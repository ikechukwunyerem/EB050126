// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay in milliseconds.
 * Used for search inputs — prevents firing an API call on every keystroke.
 *
 * @param {any}    value  The value to debounce
 * @param {number} delay  Milliseconds to wait (default 400)
 * @returns The debounced value
 */
export default function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
