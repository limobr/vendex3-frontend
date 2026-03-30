// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';
import { Alert, AppState } from 'react-native';
import { API_URL } from '../constants';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  // Check server connectivity
  const checkServerConnectivity = async () => {
    try {
      // Set a short timeout to avoid long delays
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const connectivityPromise = axios.get(`${API_URL}/health/`, { 
        timeout: 3000 
      });
      
      await Promise.race([connectivityPromise, timeoutPromise]);
      setIsOnline(true);
      return true;
    } catch (error) {
      console.log("🌐 Server offline:", error.message);
      setIsOnline(false);
      return false;
    }
  };

  // Helper function to safely store data in SecureStore
  const setSecureItem = async (key, value) => {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else if (typeof value !== 'string') {
        value = String(value);
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.log(`❌ Error storing ${key}:`, error);
      throw error;
    }
  };

  // Helper function to safely get data from SecureStore
  const getSecureItem = async (key) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;
      
      // Try to parse as JSON, if it fails return as string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.log(`❌ Error reading ${key}:`, error);
      return null;
    }
  };

  const initializeApp = async () => {
    try {
      console.log("🔐 Initializing Auth Context...");
      
      const [pin, userData] = await Promise.all([
        getSecureItem('vendex_pin'),
        getSecureItem('user_data')
      ]);

      console.log("📱 Stored data check:", { 
        hasPin: !!pin, 
        hasUserData: !!userData 
      });

      // Set PIN status
      if (pin) {
        setIsPinSet(true);
      }

      // Set user data if available
      if (userData && typeof userData === 'object') {
        setUser(userData);
        console.log("✅ User restored from storage:", userData.username);
      }

      // Check server connectivity but don't wait for it to complete
      // This prevents blocking the app initialization
      checkServerConnectivity().then(isConnected => {
        console.log(`🌐 Server connectivity: ${isConnected ? 'Online' : 'Offline'}`);
        
        // Only try to refresh token if we're online and have user data
        if (isConnected && userData) {
          refreshAccessToken().then(tokenValid => {
            console.log("🔄 Token refresh on init:", tokenValid ? "success" : "failed");
          });
        }
      });

    } catch (error) {
      console.log("❌ Init error:", error);
    } finally {
      // Always set loading to false after a short delay to ensure smooth UX
      setTimeout(() => {
        setIsLoading(false);
        console.log("🚀 Auth context initialized");
      }, 500);
    }
  };

  const refreshAccessToken = async () => {
    if (!isOnline) {
      console.log("🌐 Skipping token refresh - offline mode");
      return false;
    }

    try {
      const refresh = await getSecureItem('refresh_token');
      if (!refresh) {
        console.log("❌ No refresh token found");
        return false;
      }

      console.log("🔄 Refreshing access token...");
      const res = await axios.post(`${API_URL}/auth/refresh/`, { 
        refresh: String(refresh) 
      }, { timeout: 5000 });

      if (res.data.access) {
        await setSecureItem('access_token', res.data.access);
        console.log("✅ Token refreshed successfully");
        setIsOnline(true);
        return true;
      }
    } catch (error) {
      console.log("❌ Token refresh failed:", error.response?.data || error.message);
      setIsOnline(false);
      return false;
    }
  };

  const login = async (identifier, password) => {
    try {
      console.log("🔐 Attempting login for:", identifier);
      
      // First check if we're online
      const online = await checkServerConnectivity();
      
      if (!online) {
        return { 
          success: false, 
          error: 'Network error. Please check your connection and try again.' 
        };
      }

      const response = await axios.post(`${API_URL}/auth/login/`, {
        username: identifier.trim(),
        password,
      }, { timeout: 10000 });

      console.log("✅ Login response received:", response.data);

      const { access, refresh } = response.data;

      // Check if user data exists in the response
      let userData = null;

      if (response.data.user) {
        userData = response.data.user;
        console.log("📊 User data found in response.user:", userData);
      } else if (response.data.id || response.data.username) {
        userData = {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          user_type: response.data.user_type
        };
        console.log("📊 User data found in response root:", userData);
      } else {
        console.log("❌ No user data in login response");
        throw new Error('No user data received from server');
      }

      // Store tokens and user data safely
      await Promise.all([
        setSecureItem('access_token', access),
        setSecureItem('refresh_token', refresh),
        setSecureItem('user_data', userData)
      ]);

      setUser(userData);
      setIsOnline(true);
      console.log("✅ Login successful for user:", userData.username);

      // Check if user has PIN set
      const existingPin = await getSecureItem('vendex_pin');
      if (existingPin) {
        setIsPinSet(true);
      }

      return { success: true, user: userData };
    } catch (error) {
      console.log("❌ Login failed:", error);
      
      let errorMsg = 'Invalid credentials';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.response?.data?.non_field_errors) {
        errorMsg = error.response.data.non_field_errors[0];
      } else if (error.message.includes('Network Error') || error.message.includes('Timeout')) {
        errorMsg = 'Network error. Please check your connection.';
      } else if (error.message.includes('No user data')) {
        errorMsg = 'Server error: No user data received.';
      } else if (error.message.includes('SecureStore')) {
        errorMsg = 'Storage error. Please try again.';
      }

      return { success: false, error: errorMsg };
    }
  };

  const setPin = async (pin) => {
    try {
      if (!pin || pin.length !== 4) {
        throw new Error('PIN must be 4 digits');
      }

      await setSecureItem('vendex_pin', pin);
      setIsPinSet(true);
      setPinAttempts(0);
      
      console.log("✅ PIN set successfully");
      return { success: true };
    } catch (error) {
      console.log("❌ Error setting PIN:", error);
      return { success: false, error: 'Failed to set PIN' };
    }
  };

  const removePin = async () => {
    try {
      await SecureStore.deleteItemAsync('vendex_pin');
      setIsPinSet(false);
      console.log("✅ PIN removed successfully");
      return { success: true };
    } catch (error) {
      console.log("❌ Error removing PIN:", error);
      return { success: false, error: 'Failed to remove PIN' };
    }
  };

  const changePin = async (newPin) => {
    try {
      if (!newPin || newPin.length !== 4) {
        throw new Error('PIN must be 4 digits');
      }
      
      await setSecureItem('vendex_pin', newPin);
      console.log("✅ PIN changed successfully");
      return { success: true };
    } catch (error) {
      console.log("❌ Error changing PIN:", error);
      return { success: false, error: 'Failed to change PIN' };
    }
  };

  const verifyPin = async (inputPin) => {
    try {
        const storedPin = await getSecureItem('vendex_pin');

        if (!storedPin) {
        // Return false instead of showing alert
        return false;
        }

        // Ensure both are strings for comparison
        const inputPinStr = String(inputPin);
        const storedPinStr = String(storedPin);

        if (inputPinStr === storedPinStr) {
        setPinAttempts(0);
        
        // Try to refresh token in background (non-blocking)
        if (isOnline) {
            refreshAccessToken().then(success => {
            console.log("🔄 Background token refresh:", success ? "success" : "failed");
            });
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("✅ PIN verification successful");
        return true;
        } else {
        const attempts = pinAttempts + 1;
        setPinAttempts(attempts);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (attempts >= 5) {
            await emergencyWipe();
            return false;
        }

        console.log(`❌ Wrong PIN attempt ${attempts}/5`);
        return false; // Return false instead of showing alert
        }
    } catch (error) {
        console.log("❌ Error verifying PIN:", error);
        return false; // Return false instead of showing alert
    }
    };

  const authenticateBiometric = async () => {
    try {
      console.log("👆 Attempting biometric authentication...");
      
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        console.log("❌ Biometric hardware not available");
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        console.log("❌ No biometric credentials enrolled");
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Vendex',
        fallbackLabel: 'Use PIN Instead',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setPinAttempts(0);
        
        // Try to refresh token in background (non-blocking)
        if (isOnline) {
          refreshAccessToken().then(success => {
            console.log("🔄 Background token refresh:", success ? "success" : "failed");
          });
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("✅ Biometric authentication successful");
        return true;
      } else {
        console.log("❌ Biometric authentication failed:", result.error);
        return false;
      }
    } catch (error) {
      console.log("❌ Biometric error:", error);
      return false;
    }
  };

  const emergencyWipe = async () => {
    try {
      console.log("🚨 Emergency wipe initiated");
      
      // Remove all secure data
      await Promise.all([
        SecureStore.deleteItemAsync('vendex_pin'),
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('user_data'),
      ]);

      setUser(null);
      setIsPinSet(false);
      setPinAttempts(0);

      Alert.alert(
        'Security Alert',
        'Too many wrong PIN attempts. All app data has been wiped for security.',
        [{ text: 'OK' }]
      );

      console.log("✅ Emergency wipe completed");
    } catch (error) {
      console.log("❌ Emergency wipe error:", error);
    }
  };

  const logout = async () => {
    try {
      console.log("👋 Logging out user...");
      
      await Promise.all([
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('user_data'),
        // Note: We keep the PIN for next login
      ]);

      setUser(null);

      Alert.alert('Logged Out', 'You have been successfully logged out.');
      console.log("✅ Logout completed");
    } catch (error) {
      console.log("❌ Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        // State
        user,
        isPinSet,
        isLoading,
        pinAttempts,
        isOnline,

        // Auth methods
        login,
        logout,
        refreshAccessToken,
        checkServerConnectivity,

        // PIN methods
        setPin,
        removePin,
        changePin,
        verifyPin,

        // Biometric
        authenticateBiometric,

        // Security
        emergencyWipe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};