// src/context/ShopContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "./AuthContext";
import databaseService from "../database";

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const { user, authToken, apiUrl, getAuthToken } = useAuth();
  const [currentShop, setCurrentShop] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
    });

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

  // Load shops for a business (WORKS OFFLINE)
  const loadShops = async (businessId) => {
    try {
      console.log("📥 Loading shops for business:", businessId);

      // Get business to fetch its server_id if available
      const business = await databaseService.BusinessService.getBusinessById(
        businessId
      );
      let businessShops = [];

      if (business && business.server_id) {
        // If business has server_id, load shops by server business UUID
        businessShops =
          await databaseService.ShopService.getShopsByBusinessServerId(
            business.server_id
          );
      } else {
        // Fallback to local business ID
        businessShops = await databaseService.ShopService.getShopsByBusiness(
          businessId
        );
      }

      setShops(businessShops);

      console.log(
        `✅ Loaded ${businessShops.length} shops (${
          isOnline ? "Online" : "Offline"
        })`
      );
      return businessShops;
    } catch (error) {
      console.error("Error loading shops:", error);
      throw error;
    }
  };

  // Create new shop - ONLINE FIRST approach
  const createShop = async (shopData) => {
    try {
      if (!user) {
        throw new Error("User must be logged in to create a shop");
      }

      // ENFORCE ONLINE REQUIREMENT
      const online = await checkNetwork();
      if (!online) {
        return {
          success: false,
          error:
            "You must be online to create a new shop. Shop creation requires an internet connection.",
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
          "Authentication token is missing. Please log in again."
        );
      }

      console.log("🏪 Creating new shop online:", shopData.name);

      // 1. GET THE CORRECT BUSINESS FROM LOCAL DATABASE
      const localBusiness =
        await databaseService.BusinessService.getBusinessById(
          shopData.business_id
        );
      if (!localBusiness) {
        throw new Error("Business not found. Please select a valid business.");
      }

      if (!localBusiness.server_id) {
        throw new Error(
          "Business does not have a valid server ID. Please sync your business first."
        );
      }

      // 2. Prepare data for server using SERVER'S BUSINESS UUID
      const serverData = {
        business_id: localBusiness.server_id,
        name: shopData.name.trim(),
        shop_type: shopData.shop_type || "retail",
        location: shopData.location.trim(),
        phone_number: shopData.phone_number || "",
        email: shopData.email || "",
        tax_rate: parseFloat(shopData.tax_rate) || 0.0,
        currency: shopData.currency || "KES",
      };

      console.log(
        "🔄 Sending to server with business UUID:",
        localBusiness.server_id
      );

      // 3. First, create on server
      const serverResponse = await saveShopToServer(serverData, token);

      if (!serverResponse.success) {
        throw new Error(
          serverResponse.error || "Failed to create shop on server"
        );
      }

      // 4. Prepare local shop data with server UUID as primary ID
      const shopWithServerId = {
        ...shopData,
        id: serverResponse.shop.id,
        server_id: serverResponse.shop.id,
        business_id: localBusiness.id,                 // ✅ Use local business ID
        business_server_id: localBusiness.server_id,   // ✅ Store server UUID for reference
        sync_status: "synced",
        is_dirty: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: 1,
      };

      console.log("💾 Saving shop locally with ID:", serverResponse.shop.id);

      // 5. Save to local database with server UUID as primary ID
      const localResult = await databaseService.ShopService.createShop(
        shopWithServerId
      );

      if (!localResult.success) {
        console.error("❌ Failed to save shop locally:", localResult.error);
        return {
          success: true,
          shop: serverResponse.shop,
          message: "Shop created on server! (Warning: Local save failed)",
          warning: localResult.error,
        };
      }

      // 6. Update local state
      const newShop = await databaseService.ShopService.getShopById(
        localResult.id
      );

      setShops((prev) => [newShop, ...prev]);

      return {
        success: true,
        shop: newShop,
        message: "Shop created successfully and saved locally for offline use!",
      };
    } catch (error) {
      console.error("❌ Error creating shop:", error);

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
        error: error.message || "Failed to create shop",
      };
    }
  };

  // Save shop to server
  const saveShopToServer = async (shopData, token) => {
    try {
      console.log("🔄 Sending shop data to server...", shopData);

      const response = await fetch(`${apiUrl}/shops/shops/create/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shopData),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Server response received:", result.shop.id);
        return {
          success: true,
          shop: result.shop,
        };
      } else {
        throw new Error(result.error || "Server request failed");
      }
    } catch (error) {
      console.error("❌ Server save error:", error);

      if (
        error.message?.includes("Timeout") ||
        error.message?.includes("network")
      ) {
        throw new Error(
          "Cannot connect to server. Please check your internet connection."
        );
      }

      throw error;
    }
  };

  // Update shop (REQUIRES ONLINE)
  const updateShop = async (shopId, updates) => {
    try {
      console.log("📝 Updating shop:", shopId);

      // Check if user is online
      const online = await checkNetwork();
      if (!online) {
        return {
          success: false,
          error: "You must be online to update shop details.",
          requiresOnline: true,
        };
      }

      // Get shop to check if it has server_id
      const shop = await databaseService.ShopService.getShopById(shopId);
      if (!shop) {
        throw new Error("Shop not found");
      }

      // If shop has server_id, use it for API call
      const apiShopId = shop.server_id || shopId;

      // Get auth token
      let token = authToken;
      if (!token) {
        token = await getAuthToken();
      }

      if (!token) {
        throw new Error("Authentication token is missing");
      }

      console.log("🔄 Updating shop on server:", apiShopId);

      // Update on server first
      const serverResponse = await updateShopOnServer(apiShopId, updates, token);

      if (!serverResponse.success) {
        throw new Error(
          serverResponse.error || "Failed to update shop on server"
        );
      }

      // Update locally WITHOUT marking as pending sync
      console.log("💾 Updating shop locally (marking as synced)...");

      // Use a direct database query to update without marking as dirty
      const db = await databaseService.openDatabase();
      const now = new Date().toISOString();

      // Build the update query
      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === "tax_rate") {
          return parseFloat(updates[field]) || 0.0;
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      // Update WITHOUT marking as pending - this is the key change!
      await db.runAsync(
        `UPDATE shops SET ${setClause}, updated_at = ?, sync_status = 'synced', is_dirty = 0 WHERE id = ?`,
        [...values, now, String(shopId)]
      );

      console.log("✅ Shop updated successfully and marked as synced:", shopId);

      // Get the updated shop
      const updatedShop = await databaseService.ShopService.getShopById(shopId);

      // Update local state
      setShops((prev) =>
        prev.map((s) => (s.id === shopId ? updatedShop : s))
      );

      if (currentShop?.id === shopId) {
        setCurrentShop(updatedShop);
      }

      return {
        success: true,
        shop: updatedShop,
        message: "Shop updated successfully!",
      };
    } catch (error) {
      console.error("❌ Error updating shop:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Update shop on server
  const updateShopOnServer = async (shopId, updates, token) => {
    try {
      console.log("🔄 Updating shop on server:", shopId, updates);

      const response = await fetch(`${apiUrl}/shops/shops/${shopId}/update/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Shop updated on server");
        return { success: true };
      } else {
        console.error("❌ Server update failed:", result.error);
        throw new Error(result.error || "Server update failed");
      }
    } catch (error) {
      console.error("❌ Server update error:", error);

      if (
        error.message?.includes("Timeout") ||
        error.message?.includes("network")
      ) {
        throw new Error(
          "Cannot connect to server. Please check your internet connection."
        );
      }

      throw error;
    }
  };

  // Delete shop (soft delete) - REQUIRES ONLINE
  const deleteShop = async (shopId) => {
    try {
      console.log("🗑️ Deleting shop:", shopId);

      // Check if user is online
      const online = await checkNetwork();
      if (!online) {
        return {
          success: false,
          error: "You must be online to delete a shop.",
          requiresOnline: true,
        };
      }

      // Get shop to check if it has server_id
      const shop = await databaseService.ShopService.getShopById(shopId);
      if (!shop) {
        throw new Error("Shop not found");
      }

      // If shop has server_id, use it for API call
      const apiShopId = shop.server_id || shopId;

      // Get auth token
      let token = authToken;
      if (!token) {
        token = await getAuthToken();
      }

      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // Delete on server first
      const serverResponse = await deleteShopOnServer(apiShopId, token);

      if (!serverResponse.success) {
        throw new Error(
          serverResponse.error || "Failed to delete shop on server"
        );
      }

      // Then delete locally
      const localResult = await databaseService.ShopService.deleteShop(shopId);

      if (!localResult.success) {
        return { success: false, error: localResult.error };
      }

      // Update local state
      setShops((prev) => prev.filter((s) => s.id !== shopId));

      if (currentShop?.id === shopId) {
        setCurrentShop(null);
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting shop:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete shop on server
  const deleteShopOnServer = async (shopId, token) => {
    try {
      console.log("🔄 Deleting shop on server:", shopId);

      const response = await fetch(`${apiUrl}/shops/shops/${shopId}/delete/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Shop deleted on server");
        return { success: true };
      } else {
        throw new Error(result.error || "Server delete failed");
      }
    } catch (error) {
      console.error("❌ Server delete error:", error);
      throw error;
    }
  };

  // Select shop (WORKS OFFLINE)
  const selectShop = async (shopId) => {
    try {
      console.log("🏪 Selecting shop:", shopId);

      const success = await databaseService.ShopService.setCurrentShop(shopId);
      if (success) {
        const shop = await databaseService.ShopService.getShopById(shopId);
        setCurrentShop(shop);
        console.log("✅ Shop selected:", shop.name);
        return { success: true, shop };
      }

      return { success: false, error: "Failed to select shop" };
    } catch (error) {
      console.error("Error selecting shop:", error);
      return { success: false, error: error.message };
    }
  };

  // Get shop by ID (WORKS OFFLINE)
  const getShopById = async (shopId) => {
    try {
      return await databaseService.ShopService.getShopById(shopId);
    } catch (error) {
      console.error("Error getting shop:", error);
      return null;
    }
  };

  // Get shops by business server UUID (WORKS OFFLINE)
  const getShopsByBusinessServerId = async (businessServerId) => {
    try {
      return await databaseService.ShopService.getShopsByBusinessServerId(
        businessServerId
      );
    } catch (error) {
      console.error("Error getting shops by business server ID:", error);
      return [];
    }
  };

  // Sync shops from server (for initial load or refresh)
  const syncShopsFromServer = async (businessServerId) => {
    if (!isOnline) {
      return {
        success: false,
        error: "You must be online to sync shops from server.",
        requiresOnline: true,
      };
    }

    try {
      console.log(
        "🔄 Syncing shops from server for business:",
        businessServerId
      );

      const token = await getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      // First, find the local business that matches this server ID
      const localBusiness = await databaseService.BusinessService.getBusinessByServerId(
        businessServerId
      );
      if (!localBusiness) {
        throw new Error(
          `Local business not found for server ID: ${businessServerId}`
        );
      }
      const localBusinessId = localBusiness.id;

      const response = await fetch(
        `${apiUrl}/shops/shops/?business_id=${businessServerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Synced ${result.shops.length} shops from server`);

        // Save each shop locally
        for (const serverShop of result.shops) {
          const localShop = {
            id: serverShop.id, // Use server UUID as local ID
            server_id: serverShop.id,
            business_id: localBusinessId,               // ✅ Use local business ID
            business_server_id: businessServerId,       // ✅ Store server UUID
            name: serverShop.name,
            shop_type: serverShop.shop_type,
            location: serverShop.location,
            phone_number: serverShop.phone_number || "",
            email: serverShop.email || "",
            tax_rate: parseFloat(serverShop.tax_rate) || 0.0,
            currency: serverShop.currency || "KES",
            is_active: serverShop.is_active !== false ? 1 : 0,
            created_at: serverShop.created_at || new Date().toISOString(),
            updated_at: serverShop.updated_at || new Date().toISOString(),
            sync_status: "synced",
            is_dirty: 0,
          };

          await databaseService.ShopService.createOrUpdateShop(localShop);
        }

        // Reload local shops
        await loadShops(localBusinessId);

        return {
          success: true,
          count: result.shops.length,
          message: `Synced ${result.shops.length} shops from server`,
        };
      } else {
        throw new Error(result.error || "Failed to sync shops");
      }
    } catch (error) {
      console.error("❌ Shop sync error:", error);
      return {
        success: false,
        error: error.message || "Failed to sync shops from server",
      };
    }
  };

  // Clear shop data (on logout or business change)
  const clearShopData = async () => {
    try {
      setCurrentShop(null);
      setShops([]);
      console.log("🧹 Shop context cleared");
    } catch (error) {
      console.error("Error clearing shop data:", error);
    }
  };

  return (
    <ShopContext.Provider
      value={{
        // State
        currentShop,
        shops,
        loading,
        syncing,
        isOnline,

        // Methods
        checkNetwork,
        loadShops,
        createShop,
        updateShop,
        deleteShop,
        selectShop,
        getShopById,
        getShopsByBusinessServerId,
        syncShopsFromServer,
        clearShopData,

        // Database Access
        database: databaseService,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};