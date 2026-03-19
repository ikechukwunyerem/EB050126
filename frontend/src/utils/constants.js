// src/utils/constants.js
// Non-API app-wide constants.

export const MAX_CART_QUANTITY = 99;

export const RESOURCE_ACCESS_LEVELS = {
  FREE:       'free',
  SUBSCRIBER: 'subscriber',
};

export const ENGAGEMENT_TARGET_TYPES = {
  RESOURCE: 'resource',
  PRODUCT:  'product',
  BLOG:     'blog',
};

export const ORDER_STATUS = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  SHIPPED:    'shipped',
  DELIVERED:  'delivered',
  CANCELLED:  'cancelled',
};

export const PAYMENT_STATUS = {
  UNPAID:   'unpaid',
  PAID:     'paid',
  REFUNDED: 'refunded',
};

export const SUBSCRIPTION_STATUS = {
  NONE:      'none',
  ACTIVE:    'active',
  EXPIRED:   'expired',
  CANCELLED: 'cancelled',
};

export const PAYSTACK_CALLBACK_PATH = '/payment-success';
