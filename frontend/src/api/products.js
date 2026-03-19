// src/api/products.js
import apiClient from './client';

export const getProducts = (params = {}) =>
  apiClient.get('/products/', { params }).then((r) => r.data);

export const getProduct = (slug) =>
  apiClient.get(`/products/${slug}/`).then((r) => r.data);

export const getProductCategories = () =>
  apiClient.get('/product-categories/').then((r) => r.data);
