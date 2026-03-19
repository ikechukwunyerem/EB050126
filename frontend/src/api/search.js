// src/api/search.js
import apiClient from './client';

/** GET /api/search/?q=<query>[&limit=<n>]
 *  @returns {{ query, total, results: SearchResult[] }}
 */
export const globalSearch = (query, limit) =>
  apiClient
    .get('/search/', { params: { q: query, ...(limit ? { limit } : {}) } })
    .then((r) => r.data);

/** GET /api/search/saved/ */
export const getSavedSearches = (params = {}) =>
  apiClient.get('/search/saved/', { params }).then((r) => r.data);

/** POST /api/search/saved/
 *  @param {{ query: string, label?: string }} data
 */
export const saveSearch = (query, label) =>
  apiClient.post('/search/saved/', { query, ...(label ? { label } : {}) }).then((r) => r.data);

/** DELETE /api/search/saved/<id>/ */
export const deleteSavedSearch = (id) =>
  apiClient.delete(`/search/saved/${id}/`).then((r) => r.data);
