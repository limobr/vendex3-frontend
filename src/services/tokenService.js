// src/services/tokenService.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants';

let isRefreshing = false;
let refreshSubscribers = [];

const setAccessToken = async (token) => {
  if (token) {
    await SecureStore.setItemAsync('access_token', token);
  }
};

const getAccessToken = async () => {
  return await SecureStore.getItemAsync('access_token');
};

const getRefreshToken = async () => {
  return await SecureStore.getItemAsync('refresh_token');
};

const setRefreshToken = async (token) => {
  if (token) {
    await SecureStore.setItemAsync('refresh_token', token);
  }
};

const clearTokens = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};

const onRefreshed = (error, token) => {
  refreshSubscribers.forEach(cb => {
    if (error) {
      cb.reject(error);
    } else {
      cb.resolve(token);
    }
  });
  refreshSubscribers = [];
};

const refreshToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshSubscribers.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const refresh = await getRefreshToken();
    if (!refresh) {
      throw new Error('No refresh token');
    }

    const response = await axios.post(`${API_URL}/auth/refresh/`, {
      refresh: String(refresh),
    }, { timeout: 5000 });

    const newAccessToken = response.data.access;
    await setAccessToken(newAccessToken);
    onRefreshed(null, newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error('Token refresh failed:', error.message);
    // Only clear tokens if the server says the refresh token is invalid (401)
    if (error.response?.status === 401) {
      console.log('Refresh token invalid, clearing tokens');
      await clearTokens();
    }
    onRefreshed(error, null);
    throw error;
  } finally {
    isRefreshing = false;
  }
};

export default {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  refreshToken,
};