// src/utils/serverInfo.js
import { HEALTH_ENDPOINTS } from '../constants';

export const getServerInfo = async () => {
  try {
    const response = await fetch(HEALTH_ENDPOINTS.SERVER_INFO);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.log("Failed to get server info:", error);
    return null;
  }
};

export const checkDatabaseStatus = async (token) => {
  try {
    const response = await fetch(HEALTH_ENDPOINTS.DATABASE_STATUS, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.log("Failed to check database status:", error);
    return null;
  }
};

export const getUserInfo = async (token) => {
  try {
    const response = await fetch(HEALTH_ENDPOINTS.USER_INFO, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.log("Failed to get user info:", error);
    return null;
  }
};