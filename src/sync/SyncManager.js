// src/sync/SyncManager.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import NetInfo from "@react-native-community/netinfo";
import { API_URL } from "../../constants";
import databaseService from "../database";
import imageManager from "../utils/ImageManager";
import { nanoid } from 'nanoid/non-secure';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.accessToken = null;
    this.isRefreshingToken = false;
    this.refreshPromise = null;
    this.networkListener = null;
    this.autoSyncEnabled = true;
    this.wifiOnly = false;
    this.isOnline = false;
    this.connectionType = "unknown";
    this.syncProgress = {
      isRunning: false,
      currentStep: "",
      totalSteps: 0,
      completedSteps: 0,
      details: "",
    };

    this.setupNetworkListener();
  }

  // ========== NETWORK MANAGEMENT ==========
  setupNetworkListener = () => {
    this.networkListener = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;
      this.connectionType = state.type;

      console.log(
        `🌐 Network status: ${this.isOnline ? "Online" : "Offline"} (${
          this.connectionType
        })`
      );

      if (this.isOnline && wasOffline && this.autoSyncEnabled) {
        console.log("🌐 Network restored, triggering auto-sync");
        this.startAutoSync();
      }
    });
  };

  removeNetworkListener = () => {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  };

  // ========== INITIALIZATION ==========
  initialize = async () => {
    try {
      console.log("🔄 Initializing Sync Manager...");

      // Load settings
      const settings = await AsyncStorage.getItem("@vendex_sync_settings");
      if (settings) {
        const { autoSync, wifiOnly } = JSON.parse(settings);
        this.autoSyncEnabled = autoSync !== false;
        this.wifiOnly = wifiOnly || false;
      }

      // Load last sync time
      const lastSync = await AsyncStorage.getItem("@vendex_last_sync");
      this.lastSyncTime = lastSync ? new Date(lastSync) : null;

      // Load access token
      await this.loadAccessToken();

      // Start auto-sync if enabled
      if (this.autoSyncEnabled) {
        this.startAutoSync();
      }

      console.log("✅ Sync Manager initialized");
      return true;
    } catch (error) {
      console.error("❌ Error initializing sync manager:", error);
      return false;
    }
  };

  // ========== TOKEN MANAGEMENT ==========
  loadAccessToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        this.accessToken = token;
        console.log("✅ Loaded access token from SecureStore");
      }
    } catch (error) {
      console.error("❌ Error loading access token:", error);
    }
  };

  getAccessToken = async () => {
    try {
      if (this.accessToken) {
        return this.accessToken;
      }
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        this.accessToken = token;
        return token;
      }
      console.warn("⚠️ No access token found");
      return null;
    } catch (error) {
      console.error("❌ Error getting access token:", error);
      return null;
    }
  };

  refreshAccessToken = async () => {
    if (this.isRefreshingToken) {
      return this.refreshPromise;
    }

    this.isRefreshingToken = true;
    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token found");
        }

        console.log("🔄 Refreshing access token...");

        const response = await axios.post(
          `${API_URL}/auth/refresh/`,
          { refresh: refreshToken },
          { timeout: 10000 }
        );

        if (response.data.access) {
          const newAccessToken = response.data.access;
          await SecureStore.setItemAsync("access_token", newAccessToken);
          this.accessToken = newAccessToken;
          console.log("✅ Access token refreshed");
          resolve(newAccessToken);
        } else {
          throw new Error(
            "Failed to refresh token: No access token in response"
          );
        }
      } catch (error) {
        console.error("❌ Failed to refresh access token:", error.message);
        reject(error);
      } finally {
        this.isRefreshingToken = false;
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  };

  // ========== AUTHENTICATED REQUESTS ==========
  makeAuthenticatedRequest = async (config, retryCount = 0) => {
    const MAX_RETRIES = 1;

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error("No access token");
      }

      const requestConfig = {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      };

      console.log(`🌐 Making request to: ${config.url}`);
      const response = await axios(requestConfig);
      return response;
    } catch (error) {
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log("🔐 Token expired or invalid, attempting refresh...");
        try {
          const newToken = await this.refreshAccessToken();
          if (newToken) {
            console.log("🔄 Retrying request with new token...");
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            return this.makeAuthenticatedRequest(retryConfig, retryCount + 1);
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          throw new Error("Authentication failed. Please log in again.");
        }
      }
      throw error;
    }
  };

  // ========== SYNC PROGRESS MANAGEMENT ==========
  updateSyncProgress = (updates) => {
    this.syncProgress = { ...this.syncProgress, ...updates };
    console.log(
      `📈 Sync Progress: ${this.syncProgress.currentStep} (${this.syncProgress.completedSteps}/${this.syncProgress.totalSteps})`
    );
  };

  resetSyncProgress = () => {
    this.syncProgress = {
      isRunning: false,
      currentStep: "",
      totalSteps: 0,
      completedSteps: 0,
      details: "",
    };
  };

  // ========== MAIN SYNC FUNCTION ==========
  pullDataFromServer = async (options = {}) => {
    if (this.isSyncing) {
      console.log("🔄 Sync already in progress");
      return { success: false, error: "Sync already in progress" };
    }

    try {
      this.isSyncing = true;
      this.resetSyncProgress();
      this.updateSyncProgress({
        isRunning: true,
        totalSteps: 5,
        currentStep: "Checking network connectivity...",
      });

      // Step 1: Check network
      if (!this.isOnline) {
        throw new Error(
          "No internet connection. Please connect to the internet to sync data."
        );
      }

      this.updateSyncProgress({
        completedSteps: 1,
        currentStep: "Authenticating with server...",
      });

      // Step 2: Verify token
      try {
        await this.makeAuthenticatedRequest({
          method: "get",
          url: `${API_URL}/auth/verify/`,
          timeout: 10000,
        });
      } catch (authError) {
        console.log("🔐 Auth failed, attempting token refresh...");
        try {
          await this.refreshAccessToken();
        } catch (refreshError) {
          throw new Error("Authentication failed. Please log in again.");
        }
      }

      // Step 3: Pull accounts data
      this.updateSyncProgress({
        completedSteps: 2,
        currentStep: "Downloading user accounts data...",
        details: "Fetching users, profiles, and permissions from server",
      });

      const accountsResult = await this.pullAccountsData();
      if (!accountsResult.success) {
        console.error("❌ Failed to pull accounts data:", accountsResult.error);
      }

      // Step 4: Pull business data
      this.updateSyncProgress({
        completedSteps: 3,
        currentStep: "Downloading business data...",
        details: "Fetching businesses and shops from server",
      });

      const businessResult = await this.pullBusinessData();
      if (!businessResult.success) {
        console.error("❌ Failed to pull business data:", businessResult.error);
      }

      // Step 5: Pull employee assignments
      this.updateSyncProgress({
        completedSteps: 4,
        currentStep: "Downloading employee assignments...",
        details: "Fetching employee role assignments from server",
      });

      const employeeResult = await this.pullEmployeeAssignments();
      if (!employeeResult.success) {
        console.error("❌ Failed to pull employee data:", employeeResult.error);
      }

      // Step 5b: Pull notifications, messages, config (NEW)
      this.updateSyncProgress({
        completedSteps: 4,
        currentStep: "Downloading notifications & messages...",
        details: "Fetching notifications, messages, and configuration",
      });

      try {
        const { syncAPI } = require('../services/api');
        const fullData = await syncAPI.fullDownload();
        if (fullData?.success && fullData.data) {
          const db = await databaseService.openDatabase();

          // Store notifications locally
          if (fullData.data.notifications?.length) {
            for (const n of fullData.data.notifications) {
              await db.runAsync(
                `INSERT OR REPLACE INTO notifications (id, title, message, notification_type, category, is_read, related_object_type, related_object_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [n.id, n.title, n.message, n.notification_type, n.category, n.is_read ? 1 : 0, n.related_object_type, n.related_object_id, n.created_at]
              );
            }
            console.log(`📬 Synced ${fullData.data.notifications.length} notifications`);
          }

          // Store messages locally
          if (fullData.data.messages?.length) {
            for (const m of fullData.data.messages) {
              await db.runAsync(
                `INSERT OR REPLACE INTO messages (id, sender_id, sender_name, recipient_id, recipient_name, business_id, message, is_read, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [m.id, String(m.sender_id), m.sender_name, String(m.recipient_id), m.recipient_name, m.business_id, m.message, m.is_read ? 1 : 0, m.created_at]
              );
            }
            console.log(`💬 Synced ${fullData.data.messages.length} messages`);
          }

          // Store configurations locally
          if (fullData.data.configurations?.length) {
            for (const c of fullData.data.configurations) {
              await db.runAsync(
                `INSERT OR REPLACE INTO configurations (id, business_id, primary_color, secondary_color, accent_color, theme_mode, operation_mode, default_printer_width, currency_symbol, date_format, time_format, extra_settings, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [c.id, c.business_id, c.primary_color, c.secondary_color, c.accent_color, c.theme_mode, c.operation_mode, c.default_printer_width, c.currency_symbol, c.date_format, c.time_format, JSON.stringify(c.extra_settings || {}), c.updated_at]
              );
            }
            console.log(`⚙️ Synced ${fullData.data.configurations.length} configurations`);
          }

          // Store receipt templates locally
          if (fullData.data.receipt_templates?.length) {
            for (const t of fullData.data.receipt_templates) {
              await db.runAsync(
                `INSERT OR REPLACE INTO receipt_templates (id, shop_id, header_text, footer_text, logo, layout, show_logo, show_shop_address, show_shop_phone, show_attendant_name, show_customer_name, show_tax_breakdown, show_payment_method, printer_width, custom_fields, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.id, t.shop_id, t.header_text, t.footer_text, t.logo, t.layout, t.show_logo ? 1 : 0, t.show_shop_address ? 1 : 0, t.show_shop_phone ? 1 : 0, t.show_attendant_name ? 1 : 0, t.show_customer_name ? 1 : 0, t.show_tax_breakdown ? 1 : 0, t.show_payment_method ? 1 : 0, t.printer_width, JSON.stringify(t.custom_fields || {}), t.updated_at]
              );
            }
            console.log(`🧾 Synced ${fullData.data.receipt_templates.length} receipt templates`);
          }
        }
      } catch (newDataError) {
        console.warn("⚠️ Could not sync new data types:", newDataError.message);
      }

      // Final step: Update sync timestamp
      this.updateSyncProgress({
        completedSteps: 5,
        currentStep: "Finalizing sync...",
        details: "Updating sync timestamps and cleaning up",
      });

      this.lastSyncTime = new Date();
      await AsyncStorage.setItem(
        "@vendex_last_sync",
        this.lastSyncTime.toISOString()
      );

      // Mark that we've completed initial data download for this user
      const currentUser = await databaseService.UserService.getCurrentUser();
      if (currentUser) {
        await AsyncStorage.setItem(
          `@vendex_initial_download_${currentUser.id}`,
          "true"
        );
      }

      console.log("✅ Data pull from server completed successfully!");

      const results = {
        accounts: accountsResult,
        businesses: businessResult,
        employees: employeeResult,
      };

      return {
        success: true,
        message: "Data successfully synchronized from server",
        results,
        timestamp: this.lastSyncTime.toISOString(),
      };
    } catch (error) {
      console.error("❌ Error pulling data from server:", error);
      return {
        success: false,
        error: error.message,
        requiresLogin: error.message.includes("Authentication failed"),
      };
    } finally {
      this.isSyncing = false;
      this.resetSyncProgress();
    }
  };

  // ========== SPECIFIC DATA PULL METHODS ==========

  /**
   * Pull accounts data: users, profiles, permissions, roles
   */
  pullAccountsData = async () => {
    try {
      console.log("🔑 Pulling accounts data from server...");

      // Get current user first
      const currentUser = await databaseService.UserService.getCurrentUser();
      if (!currentUser) {
        throw new Error("No current user found");
      }

      // Get server data
      const response = await this.makeAuthenticatedRequest({
        method: "get",
        url: `${API_URL}/auth/sync/`,
        timeout: 15000,
      });

      if (!response.data || !response.data.users) {
        throw new Error("Invalid response format from server");
      }

      const db = await databaseService.openDatabase();
      const serverData = response.data;
      let usersProcessed = 0;
      let errors = [];

      // Get user's businesses to filter data
      const userBusinesses = await databaseService.BusinessService.getBusinessesByOwner(
        currentUser.id
      );
      const businessServerIds = userBusinesses
        .map((b) => b.server_id)
        .filter((id) => id);

      console.log(
        `👤 Current user: ${currentUser.username}, businesses: ${businessServerIds.length}`
      );

      // Process users - FILTER: only process current user and employees in user's businesses
      if (serverData.users && Array.isArray(serverData.users)) {
        console.log(
          `👤 Found ${serverData.users.length} users on server, filtering...`
        );

        for (const serverUser of serverData.users) {
          try {
            // Skip if this is not the current user
            const isCurrentUser =
              String(serverUser.id) === String(currentUser.server_id);
            if (!isCurrentUser) {
              console.log(
                `⏭️ Skipping user ${serverUser.username} - not current user`
              );
              continue;
            }

            // Check if user exists locally by server_id
            const existingUser = await db.getFirstAsync(
              "SELECT * FROM users WHERE server_id = ?",
              [String(serverUser.id)]
            );

            const now = new Date().toISOString();

            if (existingUser) {
              // Update existing user
              await db.runAsync(
                `UPDATE users SET
                  username = ?, email = ?, first_name = ?, last_name = ?,
                  phone_number = ?, user_type = ?, is_verified = ?, is_active = ?,
                  profile_picture = ?, last_login = ?,
                  updated_at = ?, server_id = ?,
                  sync_status = 'synced', is_dirty = 0
                WHERE id = ?`,
                [
                  serverUser.username || "",
                  serverUser.email || "",
                  serverUser.first_name || "",
                  serverUser.last_name || "",
                  serverUser.phone_number || "",
                  serverUser.user_type || "employee",
                  serverUser.is_verified ? 1 : 0,
                  serverUser.is_active ? 1 : 0,
                  serverUser.profile_picture || null,
                  serverUser.last_login || null,
                  now,
                  String(serverUser.id),
                  existingUser.id,
                ]
              );

              // Update user profile (including onboarding flags)
              await this.updateUserProfile(db, existingUser.id, serverUser, now);
              usersProcessed++;
              console.log(`✅ Updated user: ${serverUser.username}`);
            } else {
              // Insert new user
              const result = await db.runAsync(
                `INSERT INTO users (
                  server_id, username, email, first_name, last_name,
                  phone_number, user_type, is_verified, is_active,
                  profile_picture, last_login,
                  created_at, updated_at, sync_status, is_dirty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  String(serverUser.id),
                  serverUser.username || "",
                  serverUser.email || "",
                  serverUser.first_name || "",
                  serverUser.last_name || "",
                  serverUser.phone_number || "",
                  serverUser.user_type || "employee",
                  serverUser.is_verified ? 1 : 0,
                  serverUser.is_active ? 1 : 0,
                  serverUser.profile_picture || null,
                  serverUser.last_login || null,
                  now,
                  now,
                  "synced",
                  0,
                ]
              );

              if (result.insertId) {
                await this.createUserProfile(
                  db,
                  result.insertId,
                  serverUser,
                  now
                );
                usersProcessed++;
                console.log(`✅ Created new user: ${serverUser.username}`);
              }
            }
          } catch (userError) {
            console.error(
              `❌ Error processing user ${serverUser.username}:`,
              userError
            );
            errors.push({ user: serverUser.username, error: userError.message });
          }
        }
      }

      // Process permissions (if provided by server)
      if (serverData.permissions && Array.isArray(serverData.permissions)) {
        console.log(`🔐 Processing ${serverData.permissions.length} permissions`);
        // Create permissions table if it doesn't exist
        try {
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS permissions (
              id TEXT PRIMARY KEY,
              server_id TEXT,
              code TEXT UNIQUE,
              name TEXT,
              description TEXT,
              category TEXT,
              is_active INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);

          for (const permission of serverData.permissions) {
            await db.runAsync(
              `INSERT OR REPLACE INTO permissions (
                id, server_id, code, name, description, category, is_active, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                permission.id || nanoid(),
                String(permission.id),
                permission.code || "",
                permission.name || "",
                permission.description || "",
                permission.category || "",
                permission.is_active ? 1 : 0,
                permission.created_at || new Date().toISOString(),
              ]
            );
          }
        } catch (permissionError) {
          console.error("Error processing permissions:", permissionError);
        }
      }

      // Process roles (if provided by server)
      if (serverData.roles && Array.isArray(serverData.roles)) {
        console.log(`👑 Processing ${serverData.roles.length} roles`);
        for (const role of serverData.roles) {
          try {
            // Check if RoleService exists and has saveRole method
            if (
              databaseService.RoleService &&
              typeof databaseService.RoleService.saveRole === "function"
            ) {
              await databaseService.RoleService.saveRole({
                server_id: String(role.id),
                name: role.name || "",
                role_type: role.role_type || "",
                description: role.description || "",
                is_default: role.is_default || false,
              });
              console.log(`✅ Saved role: ${role.name}`);
            } else {
              console.error(
                "❌ RoleService.saveRole is not available - check database service exports"
              );
              // Fallback: Save directly to database
              await this.saveRoleDirectly(db, role);
            }
          } catch (roleError) {
            console.error(`❌ Error saving role ${role.name}:`, roleError);
            errors.push({ role: role.name, error: roleError.message });
          }
        }
      }

      console.log(
        `✅ Accounts data processed: ${usersProcessed} users, ${errors.length} errors`
      );
      return {
        success: usersProcessed > 0,
        usersProcessed,
        errors,
      };
    } catch (error) {
      console.error("❌ Error pulling accounts data:", error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Fallback method to save role directly if RoleService is not available
   */
  saveRoleDirectly = async (db, roleData) => {
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO roles (
          id, server_id, name, role_type, description, is_default,
          created_at, updated_at, synced_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roleData.id || nanoid(),
          String(roleData.id),
          roleData.name || "",
          roleData.role_type || "",
          roleData.description || "",
          roleData.is_default ? 1 : 0,
          roleData.created_at || new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
          "synced",
          0,
        ]
      );
      console.log(`✅ Saved role directly: ${roleData.name}`);
    } catch (error) {
      console.error("Error saving role directly:", error);
      throw error;
    }
  };

  /**
   * Pull business data: businesses and shops
   */
  pullBusinessData = async () => {
    try {
      console.log("🏢 Pulling business data from server...");

      const response = await this.makeAuthenticatedRequest({
        method: "get",
        url: `${API_URL}/shops/businesses/user-data/`,
        timeout: 15000,
      });

      if (!response.data || !response.data.success) {
        throw new Error("Invalid response from business data endpoint");
      }

      const serverData = response.data;
      const db = await databaseService.openDatabase();
      let businessesProcessed = 0;
      let shopsProcessed = 0;
      let errors = [];

      // Get current user for linking businesses
      const currentUser = await databaseService.UserService.getCurrentUser();
      if (!currentUser) {
        throw new Error("No current user found");
      }

      // Process businesses
      if (serverData.businesses && Array.isArray(serverData.businesses)) {
        console.log(
          `📊 Found ${serverData.businesses.length} businesses on server`
        );

        for (const serverBusiness of serverData.businesses) {
          try {
            // Check if business exists locally
            const existingBusiness = await db.getFirstAsync(
              "SELECT * FROM businesses WHERE server_id = ? OR (name = ? AND owner_id = ?)",
              [String(serverBusiness.id), serverBusiness.name, currentUser.id]
            );

            const now = new Date().toISOString();

            if (existingBusiness) {
              // Update existing business
              await db.runAsync(
                `UPDATE businesses SET
                  name = ?, registration_number = ?, phone_number = ?,
                  email = ?, address = ?, is_active = ?,
                  updated_at = ?, server_id = ?,
                  sync_status = 'synced', is_dirty = 0
                 WHERE id = ?`,
                [
                  serverBusiness.name || "",
                  serverBusiness.registration_number || "",
                  serverBusiness.phone_number || "",
                  serverBusiness.email || "",
                  serverBusiness.address || "",
                  serverBusiness.is_active !== false ? 1 : 0,
                  now,
                  String(serverBusiness.id),
                  existingBusiness.id,
                ]
              );
              console.log(`✅ Updated business: ${serverBusiness.name}`);
            } else {
              // Insert new business
              await db.runAsync(
                `INSERT INTO businesses (
                  server_id, owner_id, name, registration_number,
                  phone_number, email, address, is_active,
                  created_at, updated_at, sync_status, is_dirty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  String(serverBusiness.id),
                  currentUser.id,
                  serverBusiness.name || "",
                  serverBusiness.registration_number || "",
                  serverBusiness.phone_number || "",
                  serverBusiness.email || "",
                  serverBusiness.address || "",
                  serverBusiness.is_active !== false ? 1 : 0,
                  serverBusiness.created_at || now,
                  serverBusiness.updated_at || now,
                  "synced",
                  0,
                ]
              );
              console.log(`✅ Created new business: ${serverBusiness.name}`);
            }
            businessesProcessed++;
          } catch (businessError) {
            console.error(
              `❌ Error processing business ${serverBusiness.name}:`,
              businessError
            );
            errors.push({
              business: serverBusiness.name,
              error: businessError.message,
            });
          }
        }
      }

      // Process shops
      if (serverData.shops && Array.isArray(serverData.shops)) {
        console.log(`🛍️ Found ${serverData.shops.length} shops on server`);

        for (const serverShop of serverData.shops) {
          try {
            // Find local business for this shop
            const localBusiness = await db.getFirstAsync(
              "SELECT id FROM businesses WHERE server_id = ?",
              [String(serverShop.business_id)]
            );

            if (!localBusiness) {
              console.error(
                `❌ No local business found for shop ${serverShop.name}`
              );
              continue;
            }

            // Check if shop exists locally
            const existingShop = await db.getFirstAsync(
              "SELECT * FROM shops WHERE server_id = ? OR (name = ? AND business_id = ?)",
              [String(serverShop.id), serverShop.name, localBusiness.id]
            );

            const now = new Date().toISOString();

            if (existingShop) {
              // Update existing shop
              await db.runAsync(
                `UPDATE shops SET
                  name = ?, shop_type = ?, location = ?,
                  phone_number = ?, email = ?, tax_rate = ?,
                  currency = ?, is_active = ?,
                  updated_at = ?, server_id = ?,
                  sync_status = 'synced', is_dirty = 0
                 WHERE id = ?`,
                [
                  serverShop.name || "",
                  serverShop.shop_type || "retail",
                  serverShop.location || "",
                  serverShop.phone_number || "",
                  serverShop.email || "",
                  parseFloat(serverShop.tax_rate) || 0.0,
                  serverShop.currency || "KES",
                  serverShop.is_active !== false ? 1 : 0,
                  now,
                  String(serverShop.id),
                  existingShop.id,
                ]
              );
              console.log(`✅ Updated shop: ${serverShop.name}`);
            } else {
              // Insert new shop
              await db.runAsync(
                `INSERT INTO shops (
                  server_id, business_id, name, shop_type,
                  location, phone_number, email, tax_rate,
                  currency, is_active,
                  created_at, updated_at, sync_status, is_dirty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  String(serverShop.id),
                  localBusiness.id,
                  serverShop.name || "",
                  serverShop.shop_type || "retail",
                  serverShop.location || "",
                  serverShop.phone_number || "",
                  serverShop.email || "",
                  parseFloat(serverShop.tax_rate) || 0.0,
                  serverShop.currency || "KES",
                  serverShop.is_active !== false ? 1 : 0,
                  serverShop.created_at || now,
                  serverShop.updated_at || now,
                  "synced",
                  0,
                ]
              );
              console.log(`✅ Created new shop: ${serverShop.name}`);
            }
            shopsProcessed++;
          } catch (shopError) {
            console.error(
              `❌ Error processing shop ${serverShop.name}:`,
              shopError
            );
            errors.push({ shop: serverShop.name, error: shopError.message });
          }
        }
      }

      console.log(
        `✅ Business data processed: ${businessesProcessed} businesses, ${shopsProcessed} shops`
      );
      return {
        success: businessesProcessed > 0 || shopsProcessed > 0,
        businessesProcessed,
        shopsProcessed,
        errors,
      };
    } catch (error) {
      console.error("❌ Error pulling business data:", error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Pull employee assignments – and then fetch any missing business/shop details.
   */
  pullEmployeeAssignments = async () => {
  try {
    console.log("👥 Pulling employee assignments from server...");

    const response = await this.makeAuthenticatedRequest({
      method: "get",
      url: `${API_URL}/auth/sync/`,
      timeout: 15000,
    });

    if (!response.data) {
      console.log("ℹ️ No data in response");
      return {
        success: true,
        employeesProcessed: 0,
        message: "No employee data to sync",
      };
    }

    const serverData = response.data;
    let employeesProcessed = 0;
    let errors = [];

    // Check if employees exists and is array
    if (serverData.employees && Array.isArray(serverData.employees)) {
      console.log(
        `👥 Found ${serverData.employees.length} employee assignments on server`
      );

      // Get database reference
      const db = await databaseService.openDatabase();

      // Start a single transaction for all database operations
      await db.execAsync('BEGIN TRANSACTION');

      try {
        // Step 1: Clean up duplicate data inside the transaction
        console.log("🧹 Cleaning duplicate employees (within transaction)...");
        if (typeof databaseService.cleanupDuplicateEmployeesInTransaction === 'function') {
          await databaseService.cleanupDuplicateEmployeesInTransaction(db);
        } else {
          await databaseService.cleanupDuplicateEmployees();
        }

        // Step 2: Process each employee
        for (const serverEmployee of serverData.employees) {
          try {
            // Generate a unique local ID
            const localEmployeeId = nanoid();
            
            // Check if employee already exists by server_id
            const existingEmployee = await db.getFirstAsync(
              `SELECT id FROM employees WHERE server_id = ?`,
              [String(serverEmployee.id)]
            );

            const now = new Date().toISOString();

            // Prepare employee data with proper fields
            const firstName = serverEmployee.first_name || "";
            const lastName = serverEmployee.last_name || "";
            const email = serverEmployee.email || "";
            const phoneNumber = serverEmployee.phone_number || "";
            const employmentType = serverEmployee.employment_type || "full_time";
            const salary = serverEmployee.salary || null;
            const employmentDate = serverEmployee.employment_date || now;
            const terminationDate = serverEmployee.termination_date || null;
            const isActive = serverEmployee.is_active ? 1 : 0;

            if (existingEmployee) {
              // Update existing employee
              await db.runAsync(
                `UPDATE employees SET
                  user_id = ?, 
                  business_id = ?, 
                  shop_id = ?, 
                  role_id = ?,
                  first_name = ?,
                  last_name = ?,
                  email = ?,
                  phone_number = ?,
                  employment_type = ?,
                  salary = ?,
                  is_active = ?,
                  employment_date = ?, 
                  termination_date = ?,
                  updated_at = ?, 
                  sync_status = 'synced', 
                  is_dirty = 0
                WHERE id = ?`,
                [
                  serverEmployee.user_id,
                  serverEmployee.business_id || null,
                  serverEmployee.shop_id || null,
                  serverEmployee.role_id || null,
                  firstName,
                  lastName,
                  email,
                  phoneNumber,
                  employmentType,
                  salary,
                  isActive,
                  employmentDate,
                  terminationDate,
                  now,
                  existingEmployee.id,
                ]
              );
              console.log(`✅ Updated employee: ${email}`);
            } else {
              // Insert new employee WITH LOCAL ID
              await db.runAsync(
                `INSERT INTO employees (
                  id, server_id, user_id, business_id, shop_id, role_id,
                  first_name, last_name, email, phone_number,
                  employment_type, salary, is_active,
                  employment_date, termination_date,
                  created_at, updated_at, sync_status, is_dirty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  localEmployeeId,
                  String(serverEmployee.id),
                  serverEmployee.user_id,
                  serverEmployee.business_id || null,
                  serverEmployee.shop_id || null,
                  serverEmployee.role_id || null,
                  firstName,
                  lastName,
                  email,
                  phoneNumber,
                  employmentType,
                  salary,
                  isActive,
                  employmentDate,
                  terminationDate,
                  serverEmployee.created_at || now,
                  now,
                  "synced",
                  0,
                ]
              );
              console.log(`✅ Created new employee: ${email}`);
            }
            employeesProcessed++;
          } catch (empError) {
            console.error(`❌ Error processing employee:`, empError);
            errors.push({
              employee: serverEmployee.email,
              error: empError.message,
            });
          }
        }

        // Commit transaction
        await db.execAsync('COMMIT');
        console.log(`✅ Employee assignments processed: ${employeesProcessed} assignments`);
      } catch (error) {
        // Rollback on any error
        await db.execAsync('ROLLBACK');
        console.error('❌ Transaction failed, rolled back:', error);
        throw error;
      }
    } else {
      console.log("ℹ️ No employee assignments in response or not an array");
    }

    // After processing employees, ensure a current shop is set (fallback)
    const currentUser = await databaseService.UserService.getCurrentUser();
    if (currentUser) {
      try {
        // Check if a shop is already set as current
        let currentShop = await databaseService.ShopService.getCurrentShop(currentUser.id);
        if (!currentShop) {
          const shops = await databaseService.ShopService.getUserShops(currentUser.id);
          if (shops.length > 0) {
            // Prefer a shop that is marked as current, otherwise take the first
            currentShop = shops.find(s => s.is_current) || shops[0];
            await databaseService.ShopService.setCurrentShop(currentShop.id);
            console.log(`✅ Set current shop: ${currentShop.name}`);
          } else {
            console.warn('⚠️ No shops found for user, cannot set current shop');
          }
        } else {
          console.log(`✅ Current shop already set: ${currentShop.name}`);
        }
      } catch (shopError) {
        console.error('❌ Error setting current shop:', shopError);
      }
    }

    return {
      success: true,
      employeesProcessed,
      errors,
    };
  } catch (error) {
    console.error("❌ Error pulling employee assignments:", error);
    return { 
      success: false, 
      error: error.message || "Unknown error pulling employee data" 
    };
  }
};

  /**
   * Helper: Fetch a single business by its server ID and save it locally.
   */
  fetchBusinessDetails = async (businessServerId) => {
    try {
      const db = await databaseService.openDatabase();
      const existing = await db.getFirstAsync(
        'SELECT id FROM businesses WHERE server_id = ?',
        [String(businessServerId)]
      );
      if (existing) return; // already exists

      const response = await this.makeAuthenticatedRequest({
        method: 'get',
        url: `${API_URL}/shops/businesses/${businessServerId}/`,
        timeout: 10000,
      });

      const biz = response.data;
      if (!biz) return;

      // Get current user for owner_id (fallback if not provided)
      const currentUser = await databaseService.UserService.getCurrentUser();
      const ownerId = biz.owner_id || currentUser?.id;

      await databaseService.BusinessService.createBusiness({
        id: biz.id,
        server_id: biz.id,
        owner_id: ownerId,
        name: biz.name,
        registration_number: biz.registration_number,
        phone_number: biz.phone_number,
        email: biz.email,
        address: biz.address,
        industry: biz.industry,
        business_type: biz.business_type,
        tax_id: biz.tax_id,
        website: biz.website,
        description: biz.description,
        established_date: biz.established_date,
        is_active: biz.is_active !== false ? 1 : 0,
        created_at: biz.created_at,
        updated_at: biz.updated_at,
        sync_status: 'synced',
        is_dirty: 0,
      });
      console.log(`✅ Fetched and saved business: ${biz.name}`);
    } catch (error) {
      console.error(`❌ Failed to fetch business ${businessServerId}:`, error.message);
    }
  };

  /**
   * Helper: Fetch a single shop by its server ID and save it locally.
   */
  fetchShopDetails = async (shopServerId) => {
    try {
      const db = await databaseService.openDatabase();
      const existing = await db.getFirstAsync(
        'SELECT id FROM shops WHERE server_id = ?',
        [String(shopServerId)]
      );
      if (existing) return; // already exists

      const response = await this.makeAuthenticatedRequest({
        method: 'get',
        url: `${API_URL}/shops/shops/${shopServerId}/`,
        timeout: 10000,
      });

      const shop = response.data;
      if (!shop) return;

      // Find local business using business_id from the shop
      const localBusiness = await db.getFirstAsync(
        'SELECT id FROM businesses WHERE server_id = ?',
        [String(shop.business_id)]
      );

      if (!localBusiness) {
        console.warn(`Cannot save shop ${shop.name} – business ${shop.business_id} not found locally`);
        return;
      }

      await databaseService.ShopService.createShop({
        id: shop.id,
        server_id: shop.id,
        business_id: localBusiness.id,
        name: shop.name,
        shop_type: shop.shop_type,
        location: shop.location,
        phone_number: shop.phone_number,
        email: shop.email,
        manager_id: shop.manager_id,
        tax_rate: parseFloat(shop.tax_rate) || 0.0,
        currency: shop.currency || 'KES',
        monthly_sales: parseFloat(shop.monthly_sales) || 0.0,
        employee_count: parseInt(shop.employee_count) || 0,
        is_active: shop.is_active !== false ? 1 : 0,
        created_at: shop.created_at,
        updated_at: shop.updated_at,
        sync_status: 'synced',
        is_dirty: 0,
      });
      console.log(`✅ Fetched and saved shop: ${shop.name}`);
    } catch (error) {
      console.error(`❌ Failed to fetch shop ${shopServerId}:`, error.message);
    }
  };

  // ========== HELPER METHODS ==========
  updateUserProfile = async (db, userId, serverUser, timestamp) => {
    try {
      // Handle profile picture download
      let localProfilePicture = null;
      const serverProfilePicture = serverUser.profile_picture;

      if (serverProfilePicture) {
        console.log(
          `⬇️ Downloading profile picture for user ${serverUser.username}`
        );
        localProfilePicture = await imageManager.downloadAndSaveImage(
          serverProfilePicture,
          userId
        );
      }

      // Check if profile exists
      const existingProfile = await db.getFirstAsync(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [userId]
      );

      // Prepare preferences as JSON string
      const preferencesStr = serverUser.preferences
        ? JSON.stringify(serverUser.preferences)
        : "{}";

      // Onboarding flags (if present in serverUser)
      const hasChangedTempPassword = serverUser.has_changed_temp_password ? 1 : 0;
      const isFirstLoginComplete = serverUser.is_first_login_complete ? 1 : 0;
      const onboardingCompletedAt = serverUser.onboarding_completed_at || null;

      if (existingProfile) {
        // Update existing profile
        await db.runAsync(
          `UPDATE user_profiles SET
            date_of_birth = ?,
            profile_picture = ?,
            server_profile_picture = ?,
            local_profile_picture = ?,
            pin_hash = ?,
            fcm_token = ?,
            preferences = ?,
            has_changed_temp_password = ?,
            is_first_login_complete = ?,
            onboarding_completed_at = ?,
            updated_at = ?,
            is_dirty = 0
           WHERE user_id = ?`,
          [
            serverUser.date_of_birth || null,
            serverProfilePicture || null,
            serverProfilePicture || null,
            localProfilePicture || null,
            serverUser.pin_hash || null,
            serverUser.fcm_token || null,
            preferencesStr,
            hasChangedTempPassword,
            isFirstLoginComplete,
            onboardingCompletedAt,
            timestamp,
            userId,
          ]
        );
      } else {
        // Create new profile
        await db.runAsync(
          `INSERT INTO user_profiles (
            user_id, date_of_birth, profile_picture, server_profile_picture,
            local_profile_picture, pin_hash, fcm_token, preferences,
            has_changed_temp_password, is_first_login_complete, onboarding_completed_at,
            created_at, updated_at, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            serverUser.date_of_birth || null,
            serverProfilePicture || null,
            serverProfilePicture || null,
            localProfilePicture || null,
            serverUser.pin_hash || null,
            serverUser.fcm_token || null,
            preferencesStr,
            hasChangedTempPassword,
            isFirstLoginComplete,
            onboardingCompletedAt,
            timestamp,
            timestamp,
            0,
          ]
        );
      }
    } catch (error) {
      console.error(
        `❌ Error updating user profile for user ${userId}:`,
        error
      );
      throw error;
    }
  };

  createUserProfile = async (db, userId, serverUser, timestamp) => {
    return this.updateUserProfile(db, userId, serverUser, timestamp);
  };

  // ========== SYNC STATUS & SETTINGS ==========
  getSyncStatus = async () => {
    try {
      const pendingChanges = await this.getPendingChangesCount();

      return {
        lastSync: this.lastSyncTime,
        pendingChanges,
        isSyncing: this.isSyncing,
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        autoSyncEnabled: this.autoSyncEnabled,
        wifiOnly: this.wifiOnly,
        syncProgress: this.syncProgress,
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return {
        lastSync: null,
        pendingChanges: 0,
        isSyncing: false,
        isOnline: false,
        connectionType: "unknown",
        autoSyncEnabled: false,
        wifiOnly: false,
        syncProgress: this.syncProgress,
      };
    }
  };

  getPendingChangesCount = async () => {
    try {
      const db = await databaseService.openDatabase();
      const counts = await Promise.all([
        db.getFirstAsync(
          "SELECT COUNT(*) as count FROM users WHERE is_dirty = 1"
        ),
        db.getFirstAsync(
          "SELECT COUNT(*) as count FROM user_profiles WHERE is_dirty = 1"
        ),
        db.getFirstAsync(
          "SELECT COUNT(*) as count FROM businesses WHERE is_dirty = 1"
        ),
        db.getFirstAsync(
          "SELECT COUNT(*) as count FROM shops WHERE is_dirty = 1"
        ),
        db.getFirstAsync(
          "SELECT COUNT(*) as count FROM employees WHERE is_dirty = 1"
        ),
      ]);

      const total = counts.reduce(
        (sum, result) => sum + (result?.count || 0),
        0
      );
      return total;
    } catch (error) {
      console.error("Error getting pending count:", error);
      return 0;
    }
  };

  updateSyncSettings = async (settings) => {
    try {
      const currentSettings = await AsyncStorage.getItem(
        "@vendex_sync_settings"
      );
      const parsedSettings = currentSettings ? JSON.parse(currentSettings) : {};
      const newSettings = { ...parsedSettings, ...settings };

      await AsyncStorage.setItem(
        "@vendex_sync_settings",
        JSON.stringify(newSettings)
      );

      this.autoSyncEnabled = newSettings.autoSync !== false;
      this.wifiOnly = newSettings.wifiOnly || false;

      if (this.autoSyncEnabled) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }

      return { success: true, settings: newSettings };
    } catch (error) {
      console.error("Error updating sync settings:", error);
      return { success: false, error: error.message };
    }
  };

  // ========== AUTO SYNC MANAGEMENT ==========
  startAutoSync = () => {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.wifiOnly && this.connectionType !== "wifi") {
      console.log("📶 WiFi only setting enabled and not on WiFi");
      return;
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        const pending = await this.getPendingChangesCount();
        if (pending > 0) {
          console.log(`⏰ Auto-sync triggered (${pending} pending)`);
          await this.syncPendingChanges();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log("⏰ Auto-sync started");
  };

  stopAutoSync = () => {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("⏹️ Auto-sync stopped");
    }
  };

  syncPendingChanges = async () => {
    // This method would push local changes to server
    console.log("📤 Syncing pending changes to server...");
    // Implementation would go here
  };

  // ========== SMART SYNC ==========
  smartSync = async () => {
    try {
      console.log("🧠 Starting smart sync...");

      // First, push any local changes to server
      await this.syncPendingChanges();

      // Then, pull fresh data from server
      const result = await this.pullDataFromServer();

      return {
        success: result.success,
        message: "Smart sync completed",
        details: result,
      };
    } catch (error) {
      console.error("❌ Smart sync error:", error);
      return { success: false, error: error.message };
    }
  };

  // ========== CLEANUP ==========
  cleanup = () => {
    this.stopAutoSync();
    this.removeNetworkListener();
    this.clearAccessToken();
    console.log("🧹 Sync Manager cleaned up");
  };

  clearAccessToken = () => {
    this.accessToken = null;
  };
}

// Create singleton instance
const syncManager = new SyncManager();
export default syncManager;