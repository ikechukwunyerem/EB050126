// src/api/billing.js
import apiClient from './client';

export const getInvoices = (params = {}) =>
  apiClient.get('/billing/invoices/', { params }).then((r) => r.data);

export const getInvoice = (invoiceNumber) =>
  apiClient.get(`/billing/invoices/${invoiceNumber}/`).then((r) => r.data);

/** Opens the invoice HTML in a new tab for printing/saving as PDF. */
export const getInvoiceHtmlUrl = (invoiceNumber) =>
  `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/billing/invoices/${invoiceNumber}/html/`;
