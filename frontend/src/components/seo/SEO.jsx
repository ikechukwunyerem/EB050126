// src/components/seo/SEO.jsx
// Imperatively manages <head> tags — no extra library needed.
// Usage: <SEO title="Resource Library" description="Browse..." />
// Falls back to site defaults when props are omitted.

import { useEffect } from 'react';

const SITE_NAME    = 'Efiko Education';
const DEFAULT_DESC = 'Quality teaching resources for Nigerian educators and parents — worksheets, lesson plans, and more.';
const DEFAULT_IMG  = 'https://efiko.com/og-default.png'; // update with real URL before launch
const SITE_URL     = import.meta.env.VITE_SITE_URL || 'https://efiko.com';

/**
 * @param {string}  [title]        — page title (appended with " | Efiko Education")
 * @param {string}  [description]
 * @param {string}  [image]        — absolute URL for OG image
 * @param {string}  [url]          — canonical URL (defaults to current href)
 * @param {'website'|'article'} [type]
 * @param {boolean} [noindex]      — set true for auth pages, dashboard etc.
 */
export default function SEO({
  title,
  description = DEFAULT_DESC,
  image       = DEFAULT_IMG,
  url,
  type        = 'website',
  noindex     = false,
}) {
  const fullTitle    = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);

  useEffect(() => {
    // Page title
    document.title = fullTitle;

    // Helper — find or create a <meta> tag
    const setMeta = (selector, content) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        // Parse attribute from selector like [name="description"] or [property="og:title"]
        const attrMatch = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (attrMatch) el.setAttribute(attrMatch[1], attrMatch[2]);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // Standard meta
    setMeta('[name="description"]', description);
    if (noindex) {
      setMeta('[name="robots"]', 'noindex,nofollow');
    } else {
      setMeta('[name="robots"]', 'index,follow');
    }

    // Canonical
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('[property="og:type"]',        type);
    setMeta('[property="og:site_name"]',   SITE_NAME);
    setMeta('[property="og:title"]',       fullTitle);
    setMeta('[property="og:description"]', description);
    setMeta('[property="og:image"]',       image);
    setMeta('[property="og:url"]',         canonicalUrl);

    // Twitter Card
    setMeta('[name="twitter:card"]',        'summary_large_image');
    setMeta('[name="twitter:title"]',       fullTitle);
    setMeta('[name="twitter:description"]', description);
    setMeta('[name="twitter:image"]',       image);

    // Cleanup: restore defaults when the component unmounts
    return () => {
      document.title = SITE_NAME;
    };
  }, [fullTitle, description, image, canonicalUrl, type, noindex]);

  // Renders nothing — all work done imperatively in useEffect
  return null;
}
