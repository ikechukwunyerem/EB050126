// src/api/newsletter.js
import apiClient from './client';

export const subscribe = (email) =>
  apiClient.post('/newsletter/subscribe/', { email }).then((r) => r.data);

export const unsubscribe = (token) =>
  apiClient.post('/newsletter/unsubscribe/', { token }).then((r) => r.data);

export const getMyNewsletterStatus = () =>
  apiClient.get('/newsletter/me/').then((r) => r.data);
