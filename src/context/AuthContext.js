// src/context/AuthContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import axios from "axios";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants";
import databaseService from "../database";
import tokenService from "../services/tokenService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [currentShop, setCurrentShop] = useState(null);
  const [currentEmployeeContext, setCurrentEmployeeContext] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const appStateSubscriptionRef = useRef(null);
  const userRef = useRef(user);
  const isOnlineRef = useRef(isOnline);
  const currentShopRef = useRef(currentShop);

  useEffect(() => {
    userRef.current = user;
    isOnlineRef.current = isOnline;
    currentShopRef.current = currentShop;
  }, [user, isOnline, currentShop]);

  const setSecureItem = async (key, value) => {
    try {
      if (typeof value === "object") value = JSON.stringify(value);
      else if (typeof value !== "string") value = String(value);
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.log(`❌ Error storing ${key}:`, error);
      throw error;
    }
  };

  const getSecureItem = async (key) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;
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

  useEffect(() => {
    initializeApp();

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active" && userRef.current) {
        refreshAccessToken();
      }
    };

    if (AppState && typeof AppState.addEventListener === "function") {
      appStateSubscriptionRef.current = AppState.addEventListener(
        "change",
        handleAppStateChange,
      );
    } else {
      console.warn("AppState.addEventListener is not available");
    }

    return () => {
      if (
        appStateSubscriptionRef.current &&
        typeof appStateSubscriptionRef.current.remove === "function"
      ) {
        appStateSubscriptionRef.current.remove();
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log("🔐 Initializing Auth Context...");
      const [pin, userData, accessToken] = await Promise.all([
        getSecureItem("vendex_pin"),
        getSecureItem("user_data"),
        tokenService.getAccessToken(),
      ]);

      console.log("📱 Stored data check:", {
        hasPin: !!pin,
        hasUserData: !!userData,
        hasToken: !!accessToken,
      });

      if (pin) setIsPinSet(true);
      if (accessToken) setAuthToken(accessToken);

      let localUser = null;
      try {
        localUser = await databaseService.UserService.getCurrentUser();
        if (localUser) {
          console.log("✅ User restored from local database:", {
            username: localUser.username,
            userType: localUser.user_type,
          });
          await setSecureItem("user_data", localUser);
          setUser(localUser);
          userRef.current = localUser;
        } else if (userData) {
          console.log("📥 Saving SecureStore user to local database...");
          const dbResult = await databaseService.UserService.saveUser({
            ...userData,
            server_id: String(userData.id),
            last_login: new Date().toISOString(),
          });
          if (dbResult && dbResult.id) {
            await databaseService.UserService.setCurrentUser(dbResult.id);
            setUser(userData);
            userRef.current = userData;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ Database error during initialization:", dbError);
        if (userData) {
          setUser(userData);
          userRef.current = userData;
          console.log("✅ User restored from SecureStore:", userData.username);
        }
      }

      const isConnected = await checkServerConnectivity();
      console.log(
        `🌐 Server connectivity: ${isConnected ? "Online" : "Offline"}`,
      );

      if (isConnected && accessToken && userRef.current) {
        refreshAccessToken().then((tokenValid) => {
          console.log(
            "🔄 Token refresh on init:",
            tokenValid ? "success" : "failed",
          );
        });
      }
    } catch (error) {
      console.log("❌ Init error:", error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        console.log("🚀 Auth context initialized");
      }, 500);
    }
  };

  const checkServerConnectivity = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000),
      );
      const connectivityPromise = axios.get(`${API_URL}/health/`, {
        timeout: 3000,
      });
      await Promise.race([connectivityPromise, timeoutPromise]);
      setIsOnline(true);
      isOnlineRef.current = true;
      return true;
    } catch (error) {
      console.log("🌐 Server offline:", error.message);
      setIsOnline(false);
      isOnlineRef.current = false;
      return false;
    }
  };

  const refreshAccessToken = async () => {
    if (!isOnlineRef.current) {
      console.log("🌐 Skipping token refresh - offline mode");
      return false;
    }

    try {
      const newToken = await tokenService.refreshToken();
      setAuthToken(newToken);
      setIsOnline(true);
      isOnlineRef.current = true;
      console.log("✅ Token refreshed successfully");
      return true;
    } catch (error) {
      console.log("❌ Token refresh failed:", error);
      setIsOnline(false);
      isOnlineRef.current = false;
      if (
        error.response?.status === 401 ||
        error.message === "No refresh token"
      ) {
        await logout();
      }
      return false;
    }
  };

  const login = async (identifier, password) => {
    try {
      console.log("🔐 Attempting login for:", identifier);
      const online = await checkServerConnectivity();
      if (!online) {
        return {
          success: false,
          error: "Network error. Please check your connection and try again.",
        };
      }

      const response = await axios.post(
        `${API_URL}/auth/login/`,
        {
          username: identifier.trim(),
          password,
        },
        { timeout: 30000 },
      );

      console.log("✅ Login response received:", response.data);

      const { access, refresh } = response.data;
      await tokenService.setAccessToken(access);
      await tokenService.setRefreshToken(refresh);
      setAuthToken(access);

      let userData = response.data.user || {};

      userData.requires_onboarding = response.data.requires_onboarding || false;
      userData.requires_setup = response.data.requires_setup || false;
      userData.is_first_login_complete =
        userData.is_first_login_complete ?? true;
      userData.has_changed_temp_password =
        userData.has_changed_temp_password ?? true;
      userData.assigned_shops = response.data.assigned_shops || [];

      if (response.data.configuration) {
        try {
          await AsyncStorage.setItem(
            "business_config",
            JSON.stringify(response.data.configuration),
          );
        } catch (e) {
          /* non-critical */
        }
      }

      await setSecureItem("user_data", userData);

      // Save user to local database
      let localUserId = null;
      try {
        const dbResult = await databaseService.UserService.saveUser({
          ...userData,
          server_id: String(userData.id),
          last_login: new Date().toISOString(),
          phone_number: userData.phone_number || "",
          date_of_birth: userData.date_of_birth || null,
          profile_picture: userData.profile_picture || null,
          user_type: userData.user_type || "employee",
          is_verified: userData.is_verified || false,
          has_changed_temp_password: userData.has_changed_temp_password,
          is_first_login_complete: userData.is_first_login_complete,
        });

        if (dbResult && dbResult.id) {
          localUserId = dbResult.id;
          await databaseService.UserService.setCurrentUser(localUserId);
          const fullUser =
            await databaseService.UserService.getUserById(localUserId);
          if (fullUser) {
            setUser(fullUser);
            userRef.current = fullUser;
          } else {
            // Fallback: create a minimal user object with the local ID
            const minimalUser = {
              id: localUserId,
              server_id: userData.id,
              username: userData.username,
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              user_type: userData.user_type || "employee",
              phone_number: userData.phone_number || "",
              profile_picture: userData.profile_picture || null,
              is_active: 1,
              is_verified: userData.is_verified || false,
              has_changed_temp_password: userData.has_changed_temp_password,
              is_first_login_complete: userData.is_first_login_complete,
            };
            setUser(minimalUser);
            userRef.current = minimalUser;
          }
        } else {
          // If saving user failed (unlikely), create a new local user record
          const newLocalId = nanoid();
          const fallbackUser = {
            id: newLocalId,
            server_id: userData.id,
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            user_type: userData.user_type || "employee",
            phone_number: userData.phone_number || "",
            profile_picture: userData.profile_picture || null,
            is_active: 1,
            is_verified: userData.is_verified || false,
            has_changed_temp_password: userData.has_changed_temp_password,
            is_first_login_complete: userData.is_first_login_complete,
          };
          await databaseService.UserService.saveUser(fallbackUser);
          await databaseService.UserService.setCurrentUser(newLocalId);
          setUser(fallbackUser);
          userRef.current = fallbackUser;
        }
      } catch (dbError) {
        console.warn("⚠️ Could not save user to local database:", dbError);
        // As a last resort, use the server data but mark it as not local
        const fallbackLocalId = nanoid();
        const emergencyUser = {
          id: fallbackLocalId,
          server_id: userData.id,
          ...userData,
        };
        setUser(emergencyUser);
        userRef.current = emergencyUser;
      }

      // Process assigned shops: create business, shop, employee records
      if (
        userData.assigned_shops &&
        userData.assigned_shops.length &&
        localUserId
      ) {
        for (const shopInfo of userData.assigned_shops) {
          const {
            business_id,
            business_name,
            shop_id,
            shop_name,
            role_id,
            employee_id,
          } = shopInfo;

          // 1. Create business if not exists (using server_id as local id)
          if (business_id && business_name) {
            let existingBusiness =
              await databaseService.BusinessService.getBusinessByServerId(
                business_id,
              );
            if (!existingBusiness) {
              await databaseService.BusinessService.createBusiness({
                id: business_id,
                server_id: business_id,
                owner_id: localUserId, // user may not be owner, but we need a value
                name: business_name,
                sync_status: "synced",
                is_dirty: 0,
                is_active: 1,
              });
            }
          } else {
            console.warn(
              `⚠️ Missing business_id or business_name for shop ${shop_name}, skipping business creation`,
            );
          }

          // 2. Create shop if not exists (using server_id as local id)
          if (shop_id && business_id) {
            let existingShop =
              await databaseService.ShopService.getShopByServerId(shop_id);
            if (!existingShop) {
              await databaseService.ShopService.createShop({
                id: shop_id,
                server_id: shop_id,
                business_id: business_id, // business_id is the server UUID
                name: shop_name,
                sync_status: "synced",
                is_dirty: 0,
                is_active: 1,
              });
            }
          } else {
            console.warn(
              `⚠️ Missing shop_id or business_id for shop ${shop_name}, skipping shop creation`,
            );
          }

          // 3. Create employee if not exists
          if (employee_id) {
            let existingEmployee =
              await databaseService.EmployeeService.getEmployeeById(
                employee_id,
              );
            if (!existingEmployee) {
              await databaseService.EmployeeService.createEmployee({
                id: employee_id,
                server_id: employee_id,
                user_id: localUserId,
                business_id: business_id,
                shop_id: shop_id,
                role_id: role_id,
                first_name: userData.first_name || "",
                last_name: userData.last_name || "",
                email: userData.email,
                phone_number: userData.phone_number || "",
                employment_type: "full_time",
                is_active: 1,
                sync_status: "synced",
                is_dirty: 0,
              });
            }
          } else {
            console.warn(
              `⚠️ Missing employee_id for shop ${shop_name}, skipping employee creation`,
            );
          }
        }

        // Set current shop to the first assigned shop
        const firstShop = userData.assigned_shops[0];
        if (firstShop.shop_id) {
          await databaseService.ShopService.setCurrentShop(firstShop.shop_id);
          const currentShopData = await databaseService.ShopService.getShopById(
            firstShop.shop_id,
          );
          setCurrentShop(currentShopData);
          currentShopRef.current = currentShopData;
        }
      }

      setIsOnline(true);
      isOnlineRef.current = true;
      console.log("✅ Login successful for user:", userData.username);

      const existingPin = await getSecureItem("vendex_pin");
      if (existingPin) setIsPinSet(true);

      return { success: true, user: userData };
    } catch (error) {
      console.log("❌ Login failed:", error);

      let errorMsg = "Invalid credentials";
      let passwordExpired = false;

      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
        if (error.response.data.password_expired) {
          passwordExpired = true;
        }
      } else if (error.response?.data?.non_field_errors) {
        errorMsg = error.response.data.non_field_errors[0];
      } else if (
        error.message.includes("Network Error") ||
        error.message.includes("Timeout")
      ) {
        errorMsg = "Network error. Please check your connection.";
      } else if (error.message.includes("SecureStore")) {
        errorMsg = "Storage error. Please try again.";
      }

      return { success: false, error: errorMsg, passwordExpired };
    }
  };

  const loginOffline = async (username, pin) => {
    try {
      console.log("📴 Attempting offline login for:", username);
      const db = await databaseService.openDatabase();
      const user = await db.getFirstAsync(
        "SELECT * FROM users WHERE username = ? AND is_active = 1",
        [username],
      );
      if (!user) return { success: false, error: "User not found locally" };

      const storedPin = await getSecureItem("vendex_pin");
      if (storedPin && String(storedPin) !== String(pin)) {
        return { success: false, error: "Invalid PIN" };
      }

      await databaseService.UserService.setCurrentUser(String(user.id));
      setUser(user);
      userRef.current = user;
      console.log("✅ Offline login successful:", user.username);
      return { success: true, user, isOffline: true };
    } catch (error) {
      console.log("❌ Offline login error:", error);
      return { success: false, error: "Offline login failed" };
    }
  };

  const setPin = async (pin) => {
    try {
      if (!pin || pin.length !== 4) throw new Error("PIN must be 4 digits");
      await setSecureItem("vendex_pin", pin);
      setIsPinSet(true);
      setPinAttempts(0);
      if (user) {
        await databaseService.UserProfileService.updateProfile(
          String(user.id),
          { pin_hash: pin },
        );
      }
      console.log("✅ PIN set successfully");
      return { success: true };
    } catch (error) {
      console.log("❌ Error setting PIN:", error);
      return { success: false, error: "Failed to set PIN" };
    }
  };

  const verifyPin = async (inputPin) => {
    try {
      const storedPin = await getSecureItem("vendex_pin");
      if (!storedPin) return false;

      const inputPinStr = String(inputPin);
      const storedPinStr = String(storedPin);

      if (inputPinStr === storedPinStr) {
        setPinAttempts(0);
        if (isOnlineRef.current) {
          refreshAccessToken().then((success) => {
            console.log(
              "🔄 Background token refresh:",
              success ? "success" : "failed",
            );
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
        return false;
      }
    } catch (error) {
      console.log("❌ Error verifying PIN:", error);
      return false;
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
        promptMessage: "Unlock Vendex",
        fallbackLabel: "Use PIN Instead",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setPinAttempts(0);
        if (isOnlineRef.current) {
          refreshAccessToken().then((success) => {
            console.log(
              "🔄 Background token refresh:",
              success ? "success" : "failed",
            );
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
      await tokenService.clearTokens();
      await SecureStore.deleteItemAsync("vendex_pin");
      await SecureStore.deleteItemAsync("user_data");
      setAuthToken(null);
      setUser(null);
      userRef.current = null;
      setCurrentShop(null);
      currentShopRef.current = null;
      setCurrentEmployeeContext(null);
      setIsPinSet(false);
      setPinAttempts(0);
      Alert.alert(
        "Security Alert",
        "Too many wrong PIN attempts. All app data has been wiped for security.",
        [{ text: "OK" }],
      );
      console.log("✅ Emergency wipe completed");
    } catch (error) {
      console.log("❌ Emergency wipe error:", error);
    }
  };

  const logout = async () => {
    try {
      console.log("👋 Logging out user...");
      await tokenService.clearTokens();
      await SecureStore.deleteItemAsync("user_data");
      setAuthToken(null);
      setUser(null);
      userRef.current = null;
      setCurrentShop(null);
      currentShopRef.current = null;
      setCurrentEmployeeContext(null);
      Alert.alert("Logged Out", "You have been successfully logged out.");
      console.log("✅ Logout completed");
    } catch (error) {
      console.log("❌ Logout error:", error);
    }
  };

  const getAuthToken = async () => {
    try {
      if (authToken) return authToken;
      const token = await tokenService.getAccessToken();
      if (token) setAuthToken(token);
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isPinSet,
        isLoading,
        pinAttempts,
        isOnline,
        currentShop,
        currentEmployeeContext,
        authToken,
        apiUrl: API_URL,
        login,
        loginOffline,
        logout,
        refreshAccessToken,
        checkServerConnectivity,
        setPin,
        verifyPin,
        authenticateBiometric,
        emergencyWipe,
        getAuthToken,
        database: databaseService,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
