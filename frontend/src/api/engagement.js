// src/api/engagement.js
// target_type must be one of: 'resource' | 'product' | 'blog'

import apiClient from './client';

/** GET /api/engagement/<target_type>/<target_id>/comments/ */
export const getComments = (targetType, targetId, params = {}) =>
  apiClient
    .get(`/engagement/${targetType}/${targetId}/comments/`, { params })
    .then((r) => r.data);

/** POST /api/engagement/<target_type>/<target_id>/comments/
 *  @param {{ content_input: string, parent?: number }} data
 */
export const postComment = (targetType, targetId, data) =>
  apiClient
    .post(`/engagement/${targetType}/${targetId}/comments/`, data)
    .then((r) => r.data);

/** PATCH /api/engagement/comments/<id>/
 *  @param {{ content: string }} data
 */
export const updateComment = (commentId, content) =>
  apiClient
    .patch(`/engagement/comments/${commentId}/`, { content })
    .then((r) => r.data);

/** DELETE /api/engagement/comments/<id>/ — soft-delete */
export const deleteComment = (commentId) =>
  apiClient.delete(`/engagement/comments/${commentId}/`).then((r) => r.data);

/** POST /api/engagement/<target_type>/<target_id>/rate/
 *  @param {{ score: 1|2|3|4|5 }} data
 */
export const submitRating = (targetType, targetId, score) =>
  apiClient
    .post(`/engagement/${targetType}/${targetId}/rate/`, { score })
    .then((r) => r.data);

/** GET /api/engagement/<target_type>/<target_id>/summary/ */
export const getEngagementSummary = (targetType, targetId) =>
  apiClient
    .get(`/engagement/${targetType}/${targetId}/summary/`)
    .then((r) => r.data);
