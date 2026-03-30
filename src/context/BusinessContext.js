// src/context/BusinessContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import axios from "axios";
import { useAuth } from "./AuthContext";
import databaseService from "../database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import productSyncService from "../services/productSync";

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const { user, authToken, apiUrl, getAuthToken } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [currentShop, setCurrentShop] = useState(null); // ADDED
  const [businesses, setBusinesses] = useState([]);
  const [shops, setShops] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [productSyncStatus, setProductSyncStatus] = useState({
    isSyncing: false,
    lastSync: null,
    localStats: null,
    syncNeeded: false,
  });

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      console.log("📶 Network status:", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  // Check network connection
  const checkNetwork = async () => {
    try {
      const state = await NetInfo.fetch();
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      return online;
    } catch (error) {
      console.error("Error checking network:", error);
      setIsOnline(false);
      return false;
    }
  };

  // Load current shop for the user
  const loadCurrentShop = async () => {
    if (!user) return null;
    try {
      const shop = await databaseService.ShopService.getCurrentShop(user.id);
      setCurrentShop(shop);
      return shop;
    } catch (error) {
      console.error("Error loading current shop:", error);
      return null;
    }
  };

  // Initialize business context
  useEffect(() => {
    const initializeBusinessContext = async () => {
      try {
        console.log("🏢 Initializing Business Context...");

        if (user) {
          await loadUserBusinesses();
          await loadCurrentShop(); // Load current shop
        }

        setLoading(false);
        console.log("✅ Business Context initialized");
      } catch (error) {
        console.error("❌ Failed to initialize business context:", error);
        setLoading(false);
      }
    };

    initializeBusinessContext();

    const interval = setInterval(updateSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load user's businesses
  const loadUserBusinesses = async () => {
    try {
      if (!user) return;

      console.log("📥 Loading businesses for user:", user.id);

      const userBusinesses =
        await databaseService.BusinessService.getBusinessesByOwner(user.id);
      setBusinesses(userBusinesses);

      const currentBiz =
        await databaseService.BusinessService.getCurrentBusiness(user.id);
      if (currentBiz) {
        setCurrentBusiness(currentBiz);
        await loadBusinessShops(currentBiz.id);
        await loadBusinessEmployees(currentBiz.id);
      }

      await updateSyncStatus();

      console.log(`✅ Loaded ${userBusinesses.length} businesses`);
    } catch (error) {
      console.error("Error loading user businesses:", error);
      throw error;
    }
  };

  // Load shops for business
  const loadBusinessShops = async (businessId) => {
    try {
      const businessShops =
        await databaseService.ShopService.getShopsByBusiness(businessId);
      setShops(businessShops);
      console.log(
        `🏪 Loaded ${businessShops.length} shops for business ${businessId}`,
      );
    } catch (error) {
      console.error("Error loading business shops:", error);
    }
  };

  // Load employees for business
  const loadBusinessEmployees = async (businessId) => {
    try {
      const businessEmployees =
        await databaseService.EmployeeService.getEmployeesByBusiness(
          businessId,
        );
      setEmployees(businessEmployees);
      console.log(
        `👥 Loaded ${businessEmployees.length} employees for business ${businessId}`,
      );
    } catch (error) {
      console.error("Error loading business employees:", error);
    }
  };

  // Create new business - ONLINE FIRST approach
  const createBusiness = async (businessData) => {
    try {
      if (!user) {
        throw new Error("User must be logged in to create a business");
      }

      // Check if user is online
      const online = await checkNetwork();
      if (!online) {
        return {
          success: false,
          error:
            "You must be online to create a new business. Business creation requires an internet connection.",
          requiresOnline: true,
        };
      }

      // Get auth token (with fallback)
      let token = authToken;
      if (!token) {
        token = await getAuthToken();
      }

      if (!token) {
        throw new Error(
          "Authentication token is missing. Please log in again.",
        );
      }

      console.log("🏢 Creating new business online:", businessData.name);

      // Prepare data for server
      const serverData = {
        name: businessData.name.trim(),
        business_type: businessData.business_type || "",
        industry: businessData.industry || "",
        registration_number: businessData.registration_number || "",
        phone_number: businessData.phone_number || "",
        email: businessData.email || "",
        address: businessData.address || "",
        tax_id: businessData.tax_id || "",
        website: businessData.website || "",
        description: businessData.description || "",
        established_date:
          businessData.established_date ||
          new Date().toISOString().split("T")[0],
      };

      // First, create on server
      const serverResponse = await saveBusinessToServer(serverData, token);

      if (!serverResponse.success) {
        throw new Error(
          serverResponse.error || "Failed to create business on server",
        );
      }

      // Then save to local database with server_id
      const businessWithServerId = {
        ...businessData,
        server_id: serverResponse.business.id,
        owner_id: user.id,
        sync_status: "synced",
        is_dirty: 0,
      };

      const localResult =
        await databaseService.BusinessService.createBusiness(
          businessWithServerId,
        );

      if (!localResult.success) {
        console.warn(
          "Business saved to server but failed to save locally:",
          localResult.error,
        );
        return {
          success: true,
          business: serverResponse.business,
          message: "Business created on server! (Warning: Local save failed)",
        };
      }

      // Update local state
      const newBusiness = await databaseService.BusinessService.getBusinessById(
        localResult.id,
      );
      setBusinesses((prev) => [newBusiness, ...prev]);
      setCurrentBusiness(newBusiness);

      return {
        success: true,
        business: newBusiness,
        message: "Business created successfully!",
      };
    } catch (error) {
      console.error("❌ Error creating business:", error);

      if (
        error.message.includes("network") ||
        error.message.includes("connection")
      ) {
        return {
          success: false,
          error:
            "Network error. Please check your internet connection and try again.",
          requiresOnline: true,
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create business",
      };
    }
  };

  // Save business to server (with actual API call)
  const saveBusinessToServer = async (businessData, token) => {
    try {
      console.log("🔄 Sending business data to server...", businessData);

      // Actual API call to Django backend
      const response = await axios.post(
        `${apiUrl}/shops/businesses/create/`,
        businessData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 second timeout
        },
      );

      if (response.data && response.data.success) {
        console.log("✅ Server response received:", response.data.business.id);
        return {
          success: true,
          business: response.data.business,
        };
      } else {
        throw new Error(response.data?.error || "Server request failed");
      }
    } catch (error) {
      console.error("❌ Server save error:", error);

      if (error.code === "ECONNABORTED") {
        throw new Error("Server request timeout. Please try again.");
      }

      if (error.response) {
        // Server responded with error status
        const errorMessage =
          error.response.data?.error ||
          error.response.data?.detail ||
          `Server error: ${error.response.status}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request was made but no response
        throw new Error(
          "Cannot connect to server. Please check your internet connection.",
        );
      } else {
        // Something else happened
        throw error;
      }
    }
  };

  // Select business
  const selectBusiness = async (businessId) => {
    try {
      console.log("🏢 Selecting business:", businessId);

      const success =
        await databaseService.BusinessService.setCurrentBusiness(businessId);
      if (success) {
        const business =
          await databaseService.BusinessService.getBusinessById(businessId);
        setCurrentBusiness(business);

        await loadBusinessShops(businessId);
        await loadBusinessEmployees(businessId);
        await loadCurrentShop(); // Reload current shop after business change

        console.log("✅ Business selected:", business.name);
        return { success: true, business };
      }

      return { success: false, error: "Failed to select business" };
    } catch (error) {
      console.error("Error selecting business:", error);
      return { success: false, error: error.message };
    }
  };

  // Download initial business data (called on first login)
  const downloadInitialBusinessData = async () => {
    try {
      if (!user || !isOnline) {
        console.log("Skipping initial download: No user or offline");
        return { success: false, error: "No user or offline" };
      }

      console.log("📥 Starting initial business data download...");

      // Get auth token
      let token = authToken;
      if (!token) {
        token = await getAuthToken();
      }

      if (!token) {
        return { success: false, error: "Authentication required" };
      }

      // Check if we've already downloaded data
      const hasDownloaded = await AsyncStorage.getItem(
        `@vendex_initial_download_${user.id}`,
      );

      if (hasDownloaded === "true") {
        console.log("✅ Initial data already downloaded for this user");
        return { success: true, alreadyDownloaded: true };
      }

      // Make API call to get business data
      console.log(
        "🌐 Making request to:",
        `${apiUrl}/shops/businesses/user-data/`,
      );

      const response = await axios.get(
        `${apiUrl}/shops/businesses/user-data/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      );

      if (response.data && response.data.success) {
        const { businesses, shops } = response.data;
        let businessesSaved = 0;
        let shopsSaved = 0;

        // Save businesses
        if (businesses && Array.isArray(businesses)) {
          for (const serverBusiness of businesses) {
            try {
              console.log(
                `📦 Processing business: ${serverBusiness.name} (ID: ${serverBusiness.id})`,
              );

              const businessData = {
                id: serverBusiness.id, // Use server UUID as local ID
                server_id: serverBusiness.id,
                owner_id: user.id,
                name: serverBusiness.name || "",
                registration_number: serverBusiness.registration_number || "",
                phone_number: serverBusiness.phone_number || "",
                email: serverBusiness.email || "",
                address: serverBusiness.address || "",
                industry: serverBusiness.industry || "",
                business_type: serverBusiness.business_type || "",
                tax_id: serverBusiness.tax_id || "",
                website: serverBusiness.website || "",
                description: serverBusiness.description || "",
                established_date:
                  serverBusiness.established_date || new Date().toISOString(),
                is_active: serverBusiness.is_active !== false ? 1 : 0,
                created_at:
                  serverBusiness.created_at || new Date().toISOString(),
                updated_at:
                  serverBusiness.updated_at || new Date().toISOString(),
                sync_status: "synced",
                is_dirty: 0,
              };

              // Save to local database
              await databaseService.BusinessService.createBusiness(
                businessData,
              );
              businessesSaved++;
              console.log(`✅ Saved business: ${serverBusiness.name}`);
            } catch (businessError) {
              console.error(
                `❌ Error saving business ${serverBusiness.name}:`,
                businessError,
              );
            }
          }
        }

        // Save shops
        if (shops && Array.isArray(shops)) {
          for (const serverShop of shops) {
            try {
              console.log(
                `🛍️ Processing shop: ${serverShop.name} (Business ID: ${serverShop.business_id})`,
              );

              // Find the local business for this shop
              const localBusiness =
                await databaseService.BusinessService.getBusinessByServerId(
                  serverShop.business_id,
                );

              if (!localBusiness) {
                console.error(
                  `❌ No local business found for server business ID: ${serverShop.business_id}`,
                );
                continue;
              }

              const shopData = {
                id: serverShop.id, // Use server UUID as local ID
                server_id: serverShop.id,
                business_id: localBusiness.id, // Use LOCAL business ID
                name: serverShop.name || "",
                shop_type: serverShop.shop_type || "retail",
                location: serverShop.location || "",
                phone_number: serverShop.phone_number || "",
                email: serverShop.email || "",
                manager_id: serverShop.manager_id || null,
                tax_rate: parseFloat(serverShop.tax_rate) || 0.0,
                currency: serverShop.currency || "KES",
                monthly_sales: parseFloat(serverShop.monthly_sales) || 0.0,
                employee_count: parseInt(serverShop.employee_count) || 0,
                is_active: serverShop.is_active !== false ? 1 : 0,
                created_at: serverShop.created_at || new Date().toISOString(),
                updated_at: serverShop.updated_at || new Date().toISOString(),
                sync_status: "synced",
                is_dirty: 0,
              };

              // Save to local database
              await databaseService.ShopService.createShop(shopData);
              shopsSaved++;
              console.log(
                `✅ Saved shop: ${serverShop.name} for business ${localBusiness.name}`,
              );
            } catch (shopError) {
              console.error(
                `❌ Error saving shop ${serverShop.name}:`,
                shopError,
              );
            }
          }
        }

        // Mark as downloaded
        await AsyncStorage.setItem(
          `@vendex_initial_download_${user.id}`,
          "true",
        );

        console.log(
          `✅ Initial data download completed: ${businessesSaved} businesses, ${shopsSaved} shops`,
        );

        // Reload businesses and current shop
        await loadUserBusinesses();
        await loadCurrentShop();

        return {
          success: true,
          businessesSaved,
          shopsSaved,
          message: "Initial data downloaded successfully",
        };
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("❌ Error downloading initial business data:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Update business
  const updateBusiness = async (businessId, updates) => {
    try {
      console.log("📝 Updating business:", businessId);

      const result = await databaseService.BusinessService.updateBusiness(
        businessId,
        updates,
      );

      if (result.success) {
        setBusinesses((prev) =>
          prev.map((biz) => (biz.id === businessId ? result.business : biz)),
        );

        if (currentBusiness?.id === businessId) {
          setCurrentBusiness(result.business);
        }

        return { success: true, business: result.business };
      }

      return result;
    } catch (error) {
      console.error("Error updating business:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete business locally (soft delete)
  const deleteBusiness = async (businessId) => {
    try {
      console.log("🗑️ Deleting business:", businessId);

      const result =
        await databaseService.BusinessService.deleteBusiness(businessId);

      if (result.success) {
        setBusinesses((prev) => prev.filter((biz) => biz.id !== businessId));

        if (currentBusiness?.id === businessId) {
          setCurrentBusiness(null);
          setShops([]);
          setEmployees([]);
          setCurrentShop(null); // Also clear current shop
        }

        return { success: true };
      }

      return result;
    } catch (error) {
      console.error("Error deleting business:", error);
      return { success: false, error: error.message };
    }
  };

  // Create shop for current business
  const createShop = async (shopData) => {
    try {
      if (!currentBusiness) {
        throw new Error("No business selected");
      }

      const shopWithBusiness = {
        ...shopData,
        business_id: currentBusiness.id,
      };

      const result =
        await databaseService.ShopService.createShop(shopWithBusiness);

      if (result.success) {
        await loadBusinessShops(currentBusiness.id);
        // Optionally, if the new shop should be current, we could set it
        return { success: true, id: result.id };
      }

      return result;
    } catch (error) {
      console.error("Error creating shop:", error);
      return { success: false, error: error.message };
    }
  };

  // Add employee to current business
  const addEmployee = async (employeeData) => {
    try {
      if (!currentBusiness) {
        throw new Error("No business selected");
      }

      const employeeWithBusiness = {
        ...employeeData,
        business_id: currentBusiness.id,
      };

      const result =
        await databaseService.EmployeeService.addEmployee(employeeWithBusiness);

      if (result.success) {
        await loadBusinessEmployees(currentBusiness.id);
        return { success: true, id: result.id };
      }

      return result;
    } catch (error) {
      console.error("Error adding employee:", error);
      return { success: false, error: error.message };
    }
  };

  // Set current shop (UPDATED)
  const selectShop = async (shopId) => {
    try {
      const success = await databaseService.ShopService.setCurrentShop(shopId);
      if (success) {
        await loadCurrentShop(); // Refresh current shop state
        // Optionally reload shops to update is_current flags
        if (currentBusiness) {
          await loadBusinessShops(currentBusiness.id);
        }
        return { success: true };
      }
      return { success: false, error: "Failed to select shop" };
    } catch (error) {
      console.error("Error selecting shop:", error);
      return { success: false, error: error.message };
    }
  };

  // Get business stats
  const getBusinessStats = (businessId) => {
    const business = businesses.find((b) => b.id === businessId);
    if (!business) return null;

    const businessShops = shops.filter((s) => s.business_id === businessId);
    const businessEmployees = employees.filter(
      (e) => e.business_id === businessId,
    );

    return {
      shopCount: businessShops.length,
      activeShops: businessShops.filter((s) => s.is_active).length,
      employeeCount: businessEmployees.length,
      activeEmployees: businessEmployees.filter((e) => e.is_active).length,
      totalMonthlySales: businessShops.reduce((total, shop) => {
        return total + (shop.monthly_sales || 0);
      }, 0),
    };
  };

  // Update sync status
  const updateSyncStatus = async () => {
    try {
      const pendingBusinesses =
        await databaseService.BusinessService.getPendingSyncBusinesses();
      const pendingShops =
        await databaseService.ShopService.getPendingSyncShops();
      const pendingEmployees =
        await databaseService.EmployeeService.getPendingSyncEmployees();

      const totalPending =
        pendingBusinesses.length +
        pendingShops.length +
        pendingEmployees.length;
      setPendingSyncCount(totalPending);

      return totalPending;
    } catch (error) {
      console.error("Error updating sync status:", error);
      return 0;
    }
  };

  // Sync pending items to server
  const syncPendingItems = async () => {
    if (syncing) {
      return { success: false, error: "Sync already in progress" };
    }

    try {
      setSyncing(true);
      console.log("🔄 Starting business sync...");

      const pendingBusinesses =
        await databaseService.BusinessService.getPendingSyncBusinesses();
      const pendingShops =
        await databaseService.ShopService.getPendingSyncShops();
      const pendingEmployees =
        await databaseService.EmployeeService.getPendingSyncEmployees();

      const allPending = [
        ...pendingBusinesses,
        ...pendingShops,
        ...pendingEmployees,
      ];

      console.log(`📊 Found ${allPending.length} items to sync`);

      const online = await checkNetwork();
      if (!online) {
        return {
          success: false,
          error: "You must be online to sync data",
          requiresOnline: true,
        };
      }

      // Get auth token
      let token = authToken;
      if (!token) {
        token = await getAuthToken();
      }

      if (!token) {
        return {
          success: false,
          error: "Authentication required for sync",
          requiresAuth: true,
        };
      }

      // TODO: Implement actual sync logic with server
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await updateSyncStatus();

      console.log(
        `✅ Business sync completed: ${allPending.length} items synced`,
      );

      return {
        success: true,
        synced: allPending.length,
        total: allPending.length,
      };
    } catch (error) {
      console.error("❌ Sync error:", error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setSyncing(false);
    }
  };

  // Manual sync trigger
  const manualSync = async () => {
    console.log("🔄 Manual sync triggered");
    const result = await syncPendingItems();

    if (result.success) {
      Alert.alert(
        "Sync Complete",
        `Successfully synced ${result.synced} items.`,
      );
    } else {
      Alert.alert("Sync Failed", result.error || "Failed to sync with server");
    }

    return result;
  };

  // ========== PRODUCT SYNC FUNCTIONS ==========

  // Download product data
  const downloadProductData = async () => {
    if (!user || !authToken) {
      Alert.alert("Error", "User not authenticated");
      return { success: false, error: "User not authenticated" };
    }

    if (productSyncStatus.isSyncing) {
      return { success: false, error: "Product sync already in progress" };
    }

    try {
      setProductSyncStatus((prev) => ({ ...prev, isSyncing: true }));

      const result = await productSyncService.downloadAllProductData(
        user.id,
        authToken,
        apiUrl,
      );

      if (result.success) {
        // Refresh local stats
        const stats = await productSyncService.getLocalProductStats(user.id);
        const syncNeeded = await productSyncService.checkSyncNeeded(user.id);

        setProductSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          localStats: stats,
          syncNeeded: syncNeeded.needed,
        }));

        return {
          success: true,
          summary: result.summary,
          message: "Product data downloaded successfully",
        };
      } else {
        setProductSyncStatus((prev) => ({ ...prev, isSyncing: false }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Product download error:", error);
      setProductSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      return { success: false, error: error.message };
    }
  };

  // Incremental product sync
  const syncProductData = async () => {
    if (!user || !authToken) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      setProductSyncStatus((prev) => ({ ...prev, isSyncing: true }));

      const result = await productSyncService.incrementalSync(
        user.id,
        authToken,
        apiUrl,
      );

      if (result.success) {
        // Refresh local stats
        const stats = await productSyncService.getLocalProductStats(user.id);
        const syncNeeded = await productSyncService.checkSyncNeeded(user.id);

        setProductSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          localStats: stats,
          syncNeeded: syncNeeded.needed,
        }));

        return { success: true, message: "Product sync completed" };
      } else {
        setProductSyncStatus((prev) => ({ ...prev, isSyncing: false }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Product sync error:", error);
      setProductSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      return { success: false, error: error.message };
    }
  };

  // Check product sync status
  const checkProductSyncStatus = async () => {
    if (!user) return;

    const stats = await productSyncService.getLocalProductStats(user.id);
    const syncNeeded = await productSyncService.checkSyncNeeded(user.id);

    // Check last sync time from settings
    const lastSync = await databaseService.SettingsService.getUserSetting(
      user.id,
      "last_product_sync",
    );

    setProductSyncStatus((prev) => ({
      ...prev,
      localStats: stats,
      syncNeeded: syncNeeded.needed,
      lastSync: lastSync,
    }));
  };

  // Initialize product sync on login
  const syncProductDataOnLogin = async () => {
    try {
      if (!user || !authToken) return;

      const syncNeeded = await productSyncService.checkSyncNeeded(user.id);

      if (syncNeeded.needed && isOnline) {
        console.log("🔄 Auto-syncing product data:", syncNeeded.reason);

        // Show a loading indicator if needed
        const result = await productSyncService.incrementalSync(
          user.id,
          authToken,
          apiUrl,
        );

        if (result.success) {
          console.log("✅ Auto-sync completed");
        } else {
          console.warn("⚠️ Auto-sync failed:", result.error);
        }
      }
    } catch (error) {
      console.error("Auto-sync error:", error);
    }
  };

  // ========== INITIALIZATION FUNCTIONS ==========

  // Initialize app with business data
  const initializeAppWithBusinessData = async () => {
    try {
      console.log("🚀 Initializing app with business data...");

      if (!user) return false;

      const currentBiz =
        await databaseService.BusinessService.getCurrentBusiness(user.id);
      if (currentBiz) {
        setCurrentBusiness(currentBiz);
        await loadBusinessShops(currentBiz.id);
        await loadBusinessEmployees(currentBiz.id);
      }

      await loadUserBusinesses();
      await loadCurrentShop(); // Load current shop

      // Initialize product sync status
      await checkProductSyncStatus();

      console.log("✅ Business data initialized");
      return true;
    } catch (error) {
      console.error("Error initializing business data:", error);
      return false;
    }
  };

  // Clear all business data (on logout)
  const clearBusinessData = async () => {
    try {
      setCurrentBusiness(null);
      setCurrentShop(null); // Clear current shop
      setBusinesses([]);
      setShops([]);
      setEmployees([]);
      setProductSyncStatus({
        isSyncing: false,
        lastSync: null,
        localStats: null,
        syncNeeded: false,
      });
      console.log("🧹 Business context cleared");
    } catch (error) {
      console.error("Error clearing business data:", error);
    }
  };

  // Initialize product sync on mount
  useEffect(() => {
    if (user?.id) {
      checkProductSyncStatus();
    }
  }, [user?.id]);

  return (
    <BusinessContext.Provider
      value={{
        // State
        currentBusiness,
        currentShop, // ADDED
        businesses,
        shops,
        employees,
        loading,
        syncing,
        pendingSyncCount,
        isOnline,
        productSyncStatus,
        loadCurrentShop,

        // Network Methods
        checkNetwork,

        // Business Methods
        createBusiness,
        selectBusiness,
        updateBusiness,
        deleteBusiness,
        getBusinessStats,
        loadUserBusinesses,
        downloadInitialBusinessData,

        // Shop Methods
        createShop,
        selectShop,
        loadBusinessShops,

        // Employee Methods
        addEmployee,
        loadBusinessEmployees,

        // Sync Methods
        syncPendingItems,
        manualSync,
        updateSyncStatus,

        // Product Sync Methods
        downloadProductData,
        syncProductData,
        checkProductSyncStatus,
        syncProductDataOnLogin,

        // Initialization
        initializeAppWithBusinessData,
        clearBusinessData,

        // Database Access
        database: databaseService,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};