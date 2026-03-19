// src/api/blog.js
import apiClient from './client';

export const getPosts = (params = {}) =>
  apiClient.get('/blog/', { params }).then((r) => r.data);

export const getPost = (slug) =>
  apiClient.get(`/blog/${slug}/`).then((r) => r.data);
