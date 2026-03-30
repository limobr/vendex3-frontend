// constants.js - Updated with all endpoints
export const API_URL = "http://192.168.100.4:8000";

// Health endpoints
export const HEALTH_ENDPOINTS = {
  HEALTH: `${API_URL}/health/`,
  SIMPLE_HEALTH: `${API_URL}/health/simple/`,
  SERVER_INFO: `${API_URL}/health/info/`,
  DATABASE_STATUS: `${API_URL}/health/db/`,
  USER_INFO: `${API_URL}/health/user/`,
};

// Auth endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_URL}/auth/login/`,
  REGISTER: `${API_URL}/auth/register/`,
  REFRESH: `${API_URL}/auth/refresh/`,
  VERIFY: `${API_URL}/auth/verify/`,
  LOGOUT: `${API_URL}/auth/logout/`,
  SYNC_ACCOUNTS: `${API_URL}/auth/sync/`,
};

// Shops endpoints
export const SHOPS_ENDPOINTS = {
  BUSINESSES: {
    CREATE: `${API_URL}/shops/businesses/create/`,
    LIST: `${API_URL}/shops/businesses/list/`,
    USER_DATA: `${API_URL}/shops/businesses/user-data/`,
  },
  SHOPS: {
    CREATE: `${API_URL}/shops/shops/create/`,
    LIST: `${API_URL}/shops/shops/list/`,
  },
  EMPLOYEES: {
    ROLES: `${API_URL}/shops/employees/roles/`,
    CREATE: `${API_URL}/shops/employees/create/`,
    LIST: `${API_URL}/shops/employees/list/`,
  },
};

// Product endpoints
export const PRODUCT_ENDPOINTS = {
  CATEGORIES: `${API_URL}/products/categories/`,
  CATEGORIES_CREATE: `${API_URL}/products/categories/create/`,
  TAXES: `${API_URL}/products/taxes/`,
  CREATE: `${API_URL}/products/create/`,
  LIST: `${API_URL}/products/list/`,
  DETAIL: (productId) => `${API_URL}/products/detail/${productId}/`,
  UPDATE: (productId) => `${API_URL}/products/update/${productId}/`,
  DELETE: (productId) => `${API_URL}/products/delete/${productId}/`,
  SYNC: `${API_URL}/products/sync/`,
  DOWNLOAD_ALL: `${API_URL}/products/download/all/`,
  SYNC_INCREMENTAL: `${API_URL}/products/sync/incremental/`,
};

// Sales endpoints
export const SALES_ENDPOINTS = {
  CREATE: `${API_URL}/sales/create/`,
  LIST: `${API_URL}/sales/list/`,
  DETAIL: (saleId) => `${API_URL}/sales/detail/${saleId}/`,
  REFUND: (saleId) => `${API_URL}/sales/refund/${saleId}/`,
  DOWNLOAD: `${API_URL}/sales/download/`,
  REPORTS: `${API_URL}/sales/reports/`,
  DASHBOARD: `${API_URL}/sales/dashboard/`,
};

// Customer endpoints
export const CUSTOMER_ENDPOINTS = {
  LIST: `${API_URL}/sales/customers/`,
  CREATE: `${API_URL}/sales/customers/create/`,
  DETAIL: (customerId) => `${API_URL}/sales/customers/${customerId}/`,
};

// Sync endpoints
export const SYNC_ENDPOINTS = {
  FULL_DOWNLOAD: `${API_URL}/sync/full-download/`,
  PUSH: `${API_URL}/sync/push/`,
  INCREMENTAL: `${API_URL}/sync/incremental/`,
};

// Notification endpoints (NEW)
export const NOTIFICATION_ENDPOINTS = {
  LIST: `${API_URL}/auth/notifications/`,
  MARK_READ: (id) => `${API_URL}/auth/notifications/${id}/read/`,
  MARK_ALL_READ: `${API_URL}/auth/notifications/read-all/`,
};

// Message endpoints (NEW)
export const MESSAGE_ENDPOINTS = {
  LIST: `${API_URL}/auth/messages/`,
  SEND: `${API_URL}/auth/messages/send/`,
  MARK_READ: (id) => `${API_URL}/auth/messages/${id}/read/`,
};

// Configuration endpoints (NEW)
export const CONFIG_ENDPOINTS = {
  GET: (businessId) => `${API_URL}/auth/config/${businessId}/`,
  UPDATE: (businessId) => `${API_URL}/auth/config/${businessId}/`,
};

// Onboarding endpoints (NEW)
export const ONBOARDING_ENDPOINTS = {
  EMPLOYEE_LOGIN: `${API_URL}/auth/employee-login/`,
  COMPLETE_ONBOARDING: `${API_URL}/auth/complete-onboarding/`,
  CHANGE_TEMP_PASSWORD: `${API_URL}/auth/change-temp-password/`,
  VERIFY_INVITE_CODE: `${API_URL}/auth/verify-invite-code/`,
};

// Receipt Template endpoints (NEW)
export const RECEIPT_ENDPOINTS = {
  GET: (shopId) => `${API_URL}/auth/receipt-templates/${shopId}/`,
  UPDATE: (shopId) => `${API_URL}/auth/receipt-templates/${shopId}/`,
};
