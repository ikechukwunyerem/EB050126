// src/api/resources.js
import apiClient from './client';

/** GET /api/resources/?page=&category__slug=&resource_type=&access_level=&search=
 *  @returns {{ count, next, previous, results: ResourceList[] }}
 */
export const getResources = (params = {}) =>
  apiClient.get('/resources/', { params }).then((r) => r.data);

/** GET /api/resources/<id>/
 *  @returns ResourceDetail — file field is null if not entitled
 */
export const getResource = (id) =>
  apiClient.get(`/resources/${id}/`).then((r) => r.data);

/** POST /api/resources/<id>/save/ — bookmark a resource */
export const saveResource = (id) =>
  apiClient.post(`/resources/${id}/save/`).then((r) => r.data);

/** DELETE /api/resources/<id>/unsave/ — remove bookmark */
export const unsaveResource = (id) =>
  apiClient.delete(`/resources/${id}/unsave/`).then((r) => r.data);

/** GET /api/resources/saved/ — user's bookmarked resources
 *  @returns {{ count, next, previous, results: SavedResource[] }}
 */
export const getSavedResources = (params = {}) =>
  apiClient.get('/resources/saved/', { params }).then((r) => r.data);

/** GET /api/categories/ — full nested MPTT category tree
 *  @returns Category[] (each category has a nested children array)
 */
export const getCategories = () =>
  apiClient.get('/categories/').then((r) => r.data);

/** GET /api/storefront/slides/ — hero slides for homepage carousel */
export const getHeroSlides = () =>
  apiClient.get('/storefront/slides/').then((r) => r.data);
