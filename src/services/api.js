// src/services/api.js - Complete with sales, customers, reports, sync
import axios from 'axios';
import tokenService from './tokenService';
import { API_URL, PRODUCT_ENDPOINTS, SALES_ENDPOINTS, CUSTOMER_ENDPOINTS, SYNC_ENDPOINTS, NOTIFICATION_ENDPOINTS, MESSAGE_ENDPOINTS, CONFIG_ENDPOINTS, ONBOARDING_ENDPOINTS, RECEIPT_ENDPOINTS } from '../../constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased from 15000 to avoid premature timeouts
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Request interceptor: add token
api.interceptors.request.use(async (config) => {
  try {
    const token = await tokenService.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) { console.error('Token interceptor error:', e); }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: refresh token on 401
api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await tokenService.refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Helper for authenticated requests
const makeAuthenticatedRequest = async (endpoint, method = 'GET', data = null) => {
  try {
    const token = await tokenService.getAccessToken();
    const config = {
      method, url: endpoint,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    };
    if (data) config.data = data;
    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error(`API ${method} ${endpoint} failed:`, error?.response?.data || error.message);
    throw error;
  }
};

// ─── Product API ─────────────────────────────────────────────────
export const productAPI = {
  getCategories: (businessId) => makeAuthenticatedRequest(`${PRODUCT_ENDPOINTS.CATEGORIES}?business_id=${businessId}`),
  createCategory: (data) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.CATEGORIES_CREATE, 'POST', data),
  getTaxes: () => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.TAXES),
  createProduct: (data) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.CREATE, 'POST', data),
  getProducts: ({ businessId, shopId, categoryId, search, includeVariants }) => {
    let url = `${PRODUCT_ENDPOINTS.LIST}?`;
    if (businessId) url += `business_id=${businessId}&`;
    if (shopId) url += `shop_id=${shopId}&`;
    if (categoryId) url += `category_id=${categoryId}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (includeVariants) url += `include_variants=${includeVariants}&`;
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
  getProduct: (id) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.DETAIL(id)),
  updateProduct: (id, data) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.UPDATE(id), 'PUT', data),
  deleteProduct: (id) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.DELETE(id), 'DELETE'),
  syncProducts: (data) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.SYNC, 'POST', data),
  downloadAllProducts: () => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.DOWNLOAD_ALL),
  incrementalSync: (data) => makeAuthenticatedRequest(PRODUCT_ENDPOINTS.SYNC_INCREMENTAL, 'POST', data),
};

// ─── Sales API ───────────────────────────────────────────────────
export const salesAPI = {
  createSale: (data) => makeAuthenticatedRequest(SALES_ENDPOINTS.CREATE, 'POST', data),
  getSales: (params = {}) => {
    let url = `${SALES_ENDPOINTS.LIST}?`;
    Object.entries(params).forEach(([k, v]) => { if (v != null) url += `${k}=${encodeURIComponent(v)}&`; });
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
  getSaleDetail: (saleId) => makeAuthenticatedRequest(SALES_ENDPOINTS.DETAIL(saleId)),
  refundSale: (saleId, data) => makeAuthenticatedRequest(SALES_ENDPOINTS.REFUND(saleId), 'POST', data),
  downloadSales: (params = {}) => {
    let url = `${SALES_ENDPOINTS.DOWNLOAD}?`;
    Object.entries(params).forEach(([k, v]) => { if (v != null) url += `${k}=${encodeURIComponent(v)}&`; });
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
  getReports: (params = {}) => {
    let url = `${SALES_ENDPOINTS.REPORTS}?`;
    Object.entries(params).forEach(([k, v]) => { if (v != null) url += `${k}=${encodeURIComponent(v)}&`; });
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
  getDashboard: (params = {}) => {
    let url = `${SALES_ENDPOINTS.DASHBOARD}?`;
    Object.entries(params).forEach(([k, v]) => { if (v != null) url += `${k}=${encodeURIComponent(v)}&`; });
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
};

// ─── Customer API ────────────────────────────────────────────────
export const customerAPI = {
  getCustomers: (businessId, search = '') => {
    let url = `${CUSTOMER_ENDPOINTS.LIST}?business_id=${businessId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return makeAuthenticatedRequest(url);
  },
  createCustomer: (data) => makeAuthenticatedRequest(CUSTOMER_ENDPOINTS.CREATE, 'POST', data),
  getCustomerDetail: (customerId) => makeAuthenticatedRequest(CUSTOMER_ENDPOINTS.DETAIL(customerId)),
  updateCustomer: (customerId, data) => makeAuthenticatedRequest(CUSTOMER_ENDPOINTS.DETAIL(customerId), 'PUT', data),
  deleteCustomer: (customerId) => makeAuthenticatedRequest(CUSTOMER_ENDPOINTS.DETAIL(customerId), 'DELETE'),
};

// ─── Sync API ────────────────────────────────────────────────────
export const syncAPI = {
  fullDownload: () => makeAuthenticatedRequest(SYNC_ENDPOINTS.FULL_DOWNLOAD),
  pushSync: (operations) => makeAuthenticatedRequest(SYNC_ENDPOINTS.PUSH, 'POST', { operations }),
  incrementalSync: (lastSync) => makeAuthenticatedRequest(SYNC_ENDPOINTS.INCREMENTAL, 'POST', { last_sync: lastSync }),
};

// ─── Employee API ────────────────────────────────────────────────
export const employeeAPI = {
  getRoles: () => makeAuthenticatedRequest('/shops/employees/roles/'),
  createEmployee: (data) => makeAuthenticatedRequest('/shops/employees/create/', 'POST', data),
  getEmployeesByShop: (shopId) => makeAuthenticatedRequest(`/shops/employees/list/?shop_id=${shopId}`),
  getEmployeesByBusiness: (businessId) => makeAuthenticatedRequest(`/shops/employees/list/?business_id=${businessId}`),
};

// ─── Shop API ────────────────────────────────────────────────────
export const shopAPI = {
  createShop: (data) => makeAuthenticatedRequest('/shops/shops/create/', 'POST', data),
  getShops: (businessId) => makeAuthenticatedRequest(`/shops/shops/list/?business_id=${businessId}`),
  getShopDetails: (shopId) => makeAuthenticatedRequest(`/shops/shops/${shopId}/`),
  updateShop: (shopId, data) => makeAuthenticatedRequest(`/shops/shops/${shopId}/update/`, 'PUT', data),
  deleteShop: (shopId) => makeAuthenticatedRequest(`/shops/shops/${shopId}/delete/`, 'DELETE'),
};

// ─── Auth API ────────────────────────────────────────────────────
export const authAPI = {
  login: async (credentials) => { const r = await api.post('/auth/login/', credentials); return r.data; },
  employeeLogin: async (credentials) => { const r = await api.post('/auth/employee-login/', credentials); return r.data; },
  requestResendCredentials: async (email) => { const r = await api.post('/auth/request-resend-credentials/', { email }); return r.data; },
};

// ─── Onboarding API (UPDATED) ────────────────────────────────────
export const onboardingAPI = {
  completeOnboarding: (data) => makeAuthenticatedRequest(ONBOARDING_ENDPOINTS.COMPLETE_ONBOARDING, 'POST', data),
  changeTempPassword: (data) => makeAuthenticatedRequest(ONBOARDING_ENDPOINTS.CHANGE_TEMP_PASSWORD, 'POST', data),
  verifyInviteCode: async (data) => { const r = await api.post(ONBOARDING_ENDPOINTS.VERIFY_INVITE_CODE, data); return r.data; },
};

// ─── Notification API ───────────────────────────────────────────
export const notificationAPI = {
  getNotifications: (params = {}) => {
    let url = `${NOTIFICATION_ENDPOINTS.LIST}?`;
    Object.entries(params).forEach(([k, v]) => { if (v != null) url += `${k}=${encodeURIComponent(v)}&`; });
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
  markRead: (id) => makeAuthenticatedRequest(NOTIFICATION_ENDPOINTS.MARK_READ(id), 'POST'),
  markAllRead: () => makeAuthenticatedRequest(NOTIFICATION_ENDPOINTS.MARK_ALL_READ, 'POST'),
};

// ─── Message API ─────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (params = {}) => {
    let url = `${MESSAGE_ENDPOINTS.LIST}?`;
    Object.entries(params).forEach(([k, v]) => { if (v != null) url += `${k}=${encodeURIComponent(v)}&`; });
    return makeAuthenticatedRequest(url.slice(0, -1));
  },
  sendMessage: (data) => makeAuthenticatedRequest(MESSAGE_ENDPOINTS.SEND, 'POST', data),
  markRead: (id) => makeAuthenticatedRequest(MESSAGE_ENDPOINTS.MARK_READ(id), 'POST'),
};

// ─── Configuration API ──────────────────────────────────────────
export const configAPI = {
  getConfig: (businessId) => makeAuthenticatedRequest(CONFIG_ENDPOINTS.GET(businessId)),
  updateConfig: (businessId, data) => makeAuthenticatedRequest(CONFIG_ENDPOINTS.UPDATE(businessId), 'PUT', data),
};

// ─── Receipt Template API ───────────────────────────────────────
export const receiptAPI = {
  getTemplate: (shopId) => makeAuthenticatedRequest(RECEIPT_ENDPOINTS.GET(shopId)),
  updateTemplate: (shopId, data) => makeAuthenticatedRequest(RECEIPT_ENDPOINTS.UPDATE(shopId), 'PUT', data),
};

export default api;