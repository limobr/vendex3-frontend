// src/services/productSync.js - FIXED VERSION
import databaseService from "../database";
import axios from "axios";
import NetInfo from "@react-native-community/netinfo";
import { nanoid } from "nanoid/non-secure";

class ProductSyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
  }

  // Download all product data for offline use
  async downloadAllProductData(userId, authToken, apiUrl) {
    try {
      console.log("📦 Starting full product data download...");

      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error("Network not available for download");
      }

      const response = await axios.get(`${apiUrl}/products/download/all/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 30000,
      });

      if (response.data.success) {
        const data = response.data.data;
        const summary = response.data.summary;

        console.log("📊 Product download summary:", summary);

        // Save to local database in a transaction
        const db = await databaseService.openDatabase();

        await db.execAsync("BEGIN TRANSACTION");
        try {
          // Save taxes
          console.log("💳 Saving taxes...");
          for (const tax of data.taxes) {
            await this.saveTax(db, tax);
          }

          // Save categories
          console.log("📁 Saving categories...");
          for (const category of data.categories) {
            // Find local business ID for this category's business
            const business = await this.getBusinessByServerId(
              db,
              category.business_id,
            );
            if (business) {
              await this.saveCategory(db, category, business.id, userId);
            }
          }

          // Save products
          console.log("📦 Saving products...");
          for (const product of data.products) {
            // Find local business ID
            const business = await this.getBusinessByServerId(
              db,
              product.business_id,
            );
            if (business) {
              await this.syncProductFromServer(
                db,
                product,
                business.id,
                userId,
              );
            }
          }

          // Save attributes
          console.log("🏷️ Saving attributes...");
          for (const attribute of data.attributes) {
            // Find local product ID
            const product = await this.getProductByServerId(
              db,
              attribute.product_id,
            );
            if (product) {
              await this.saveAttribute(db, attribute, product.id, userId);
            }
          }

          // Save attribute values
          console.log("🔤 Saving attribute values...");
          for (const value of data.attribute_values) {
            // Find local attribute ID
            const attribute = await this.getAttributeByServerId(
              db,
              value.attribute_id,
            );
            if (attribute) {
              await this.saveAttributeValue(db, value, attribute.id, userId);
            }
          }

          // Save variants
          console.log("🔄 Saving variants...");
          for (const variant of data.variants) {
            // Find local product ID
            const product = await this.getProductByServerId(
              db,
              variant.product_id,
            );
            if (product) {
              await this.saveVariant(db, variant, product.id, userId);
            }
          }

          // Save inventory
          console.log("📊 Saving inventory...");
          for (const inventory of data.inventory) {
            // Find local shop ID
            const shop = await this.getShopByServerId(db, inventory.shop_id);
            if (shop) {
              if (inventory.product_id) {
                // Find local product ID
                const product = await this.getProductByServerId(
                  db,
                  inventory.product_id,
                );
                if (product) {
                  await this.updateInventory(
                    db,
                    inventory,
                    null,
                    product.id,
                    shop.id,
                    userId,
                  );
                }
              } else if (inventory.variant_id) {
                // Find local variant ID
                const variant = await this.getVariantByServerId(
                  db,
                  inventory.variant_id,
                );
                if (variant) {
                  await this.updateInventory(
                    db,
                    inventory,
                    variant.id,
                    null,
                    shop.id,
                    userId,
                  );
                }
              }
            }
          }

          await db.execAsync("COMMIT");

          // Update last sync time
          this.lastSyncTime = new Date().toISOString();
          await this.setUserSetting(
            db,
            userId,
            "last_product_sync",
            this.lastSyncTime,
          );

          console.log("✅ Full product data download completed");
          return {
            success: true,
            summary,
            message: `Downloaded ${summary.total_records} records`,
          };
        } catch (error) {
          await db.execAsync("ROLLBACK");
          console.error("❌ Transaction error:", error);
          throw error;
        }
      } else {
        throw new Error(response.data.error || "Download failed");
      }
    } catch (error) {
      console.error("❌ Product download error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Helper method to save tax
  async saveTax(db, taxData) {
    try {
      const existingTax = await db.getFirstAsync(
        "SELECT id FROM taxes WHERE server_id = ?",
        [taxData.id],
      );

      const now = new Date().toISOString();

      if (existingTax) {
        await db.runAsync(
          `UPDATE taxes SET 
           name = ?, rate = ?, tax_type = ?, is_active = ?, updated_at = ?
           WHERE server_id = ?`,
          [taxData.name, taxData.rate, taxData.tax_type, 1, now, taxData.id],
        );
      } else {
        await db.runAsync(
          `INSERT INTO taxes (id, server_id, name, rate, tax_type, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            taxData.id,
            taxData.name,
            taxData.rate,
            taxData.tax_type,
            1,
            taxData.created_at || now,
            now,
          ],
        );
      }
      console.log(`✅ Saved tax: ${taxData.name}`);
    } catch (error) {
      console.error(`❌ Error saving tax ${taxData.name}:`, error);
    }
  }

  // Helper method to save category
  async saveCategory(db, categoryData, businessId, userId) {
    try {
      const existingCategory = await db.getFirstAsync(
        "SELECT id FROM categories WHERE server_id = ?",
        [categoryData.id],
      );

      const now = new Date().toISOString();

      if (existingCategory) {
        await db.runAsync(
          `UPDATE categories SET 
           business_id = ?, name = ?, description = ?, parent_id = ?, 
           color = ?, is_active = ?, updated_at = ?
           WHERE server_id = ?`,
          [
            businessId,
            categoryData.name,
            categoryData.description || "",
            categoryData.parent_id || null,
            categoryData.color || "#FF6B35",
            1,
            now,
            categoryData.id,
          ],
        );
      } else {
        await db.runAsync(
          `INSERT INTO categories (id, server_id, business_id, name, description, parent_id, color, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            categoryData.id,
            businessId,
            categoryData.name,
            categoryData.description || "",
            categoryData.parent_id || null,
            categoryData.color || "#FF6B35",
            1,
            categoryData.created_at || now,
            now,
          ],
        );
      }
      console.log(
        `✅ Saved category: ${categoryData.name} for business ${businessId}`,
      );
    } catch (error) {
      console.error(`❌ Error saving category ${categoryData.name}:`, error);
    }
  }

  // Helper method to sync product from server
  async syncProductFromServer(db, productData, businessId, userId) {
    try {
      const now = new Date().toISOString();

      // --- 1. Normalise barcode: empty string -> NULL ---
      let baseBarcode = productData.base_barcode;
      if (baseBarcode === "" || baseBarcode === null) {
        baseBarcode = null;
      }

      // --- 2. Check for existing product by server_id ---
      let existingProduct = await db.getFirstAsync(
        "SELECT id FROM products WHERE server_id = ?",
        [productData.id],
      );

      // --- 3. If not found, check by barcode + business ---
      if (!existingProduct && baseBarcode) {
        existingProduct = await db.getFirstAsync(
          `SELECT id FROM products 
         WHERE base_barcode = ? 
           AND (business_id = ? OR business_server_id = ?)`,
          [baseBarcode, businessId, productData.business_id],
        );
        if (existingProduct) {
          console.log(
            `⚠️ Found existing product with same barcode "${baseBarcode}" for business ${businessId}. Updating instead of creating new.`,
          );
        }
      }

      // --- 4. Find category ID (if any) ---
      let categoryId = null;
      if (productData.category_id) {
        const category = await db.getFirstAsync(
          "SELECT id FROM categories WHERE server_id = ?",
          [productData.category_id],
        );
        categoryId = category?.id || null;
      }

      // --- 5. Find tax ID (if any) ---
      let taxId = null;
      if (productData.tax_id) {
        const tax = await db.getFirstAsync(
          "SELECT id FROM taxes WHERE server_id = ?",
          [productData.tax_id],
        );
        taxId = tax?.id || null;
      }

      if (existingProduct) {
        // --- Update existing product ---
        await db.runAsync(
          `UPDATE products SET 
          business_id = ?,
          business_server_id = ?,
          name = ?,
          description = ?,
          category_id = ?,
          product_type = ?,
          has_variants = ?,
          variant_type = ?,
          base_barcode = ?,
          base_sku = ?,
          base_cost_price = ?,
          base_selling_price = ?,
          base_wholesale_price = ?,
          tax_id = ?,
          tax_inclusive = ?,
          unit_of_measure = ?,
          reorder_level = ?,
          is_trackable = ?,
          is_active = ?,
          updated_at = ?,
          synced_at = ?,
          sync_status = 'synced',
          is_dirty = 0
        WHERE id = ?`,
          [
            businessId,
            productData.business_id, // server business ID
            productData.name,
            productData.description || "",
            categoryId,
            productData.product_type || "physical",
            productData.has_variants ? 1 : 0,
            productData.variant_type || "none",
            baseBarcode,
            productData.base_sku || null,
            productData.base_cost_price || null,
            productData.base_selling_price || null,
            productData.base_wholesale_price || null,
            taxId,
            productData.tax_inclusive ? 1 : 0,
            productData.unit_of_measure || "pcs",
            productData.reorder_level || 10,
            productData.is_trackable ? 1 : 0,
            1,
            now,
            now,
            existingProduct.id,
          ],
        );
        console.log(`✅ Updated product: ${productData.name}`);
        return { success: true, id: existingProduct.id, action: "updated" };
      } else {
        // --- Insert new product ---
        const productId = nanoid(); // ✅ FIXED: use nanoid instead of this.generateId()
        await db.runAsync(
          `INSERT INTO products (
          id, server_id, business_id, business_server_id, name, description, category_id,
          product_type, has_variants, variant_type, base_barcode, base_sku,
          base_cost_price, base_selling_price, base_wholesale_price, tax_id,
          tax_inclusive, unit_of_measure, reorder_level, is_trackable, is_active,
          created_at, updated_at, synced_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            productData.id,
            businessId,
            productData.business_id,
            productData.name,
            productData.description || "",
            categoryId,
            productData.product_type || "physical",
            productData.has_variants ? 1 : 0,
            productData.variant_type || "none",
            baseBarcode,
            productData.base_sku || null,
            productData.base_cost_price || null,
            productData.base_selling_price || null,
            productData.base_wholesale_price || null,
            taxId,
            productData.tax_inclusive ? 1 : 0,
            productData.unit_of_measure || "pcs",
            productData.reorder_level || 10,
            productData.is_trackable ? 1 : 0,
            1,
            productData.created_at || now,
            now,
            now,
            "synced",
            0,
          ],
        );
        console.log(`✅ Saved product: ${productData.name}`);
        return { success: true, id: productId, action: "created" };
      }
    } catch (error) {
      console.error(`❌ Error saving product ${productData.name}:`, error);
      throw error;
    }
  }

  // Helper method to save attribute
  async saveAttribute(db, attributeData, productId, userId) {
    try {
      const existingAttribute = await db.getFirstAsync(
        "SELECT id FROM product_attributes WHERE server_id = ?",
        [attributeData.id],
      );

      const now = new Date().toISOString();

      if (existingAttribute) {
        await db.runAsync(
          `UPDATE product_attributes SET 
           product_id = ?, name = ?, display_order = ?, is_required = ?, updated_at = ?
           WHERE server_id = ?`,
          [
            productId,
            attributeData.name,
            attributeData.display_order || 0,
            attributeData.is_required ? 1 : 0,
            now,
            attributeData.id,
          ],
        );
      } else {
        await db.runAsync(
          `INSERT INTO product_attributes (id, server_id, product_id, name, display_order, is_required, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            attributeData.id,
            productId,
            attributeData.name,
            attributeData.display_order || 0,
            attributeData.is_required ? 1 : 0,
            attributeData.created_at || now,
            now,
          ],
        );
      }
    } catch (error) {
      console.error(`❌ Error saving attribute:`, error);
    }
  }

  // Helper method to save attribute value
  async saveAttributeValue(db, valueData, attributeId, userId) {
    try {
      const existingValue = await db.getFirstAsync(
        "SELECT id FROM product_attribute_values WHERE server_id = ?",
        [valueData.id],
      );

      const now = new Date().toISOString();

      if (existingValue) {
        await db.runAsync(
          `UPDATE product_attribute_values SET 
           attribute_id = ?, value = ?, display_order = ?, updated_at = ?
           WHERE server_id = ?`,
          [
            attributeId,
            valueData.value,
            valueData.display_order || 0,
            now,
            valueData.id,
          ],
        );
      } else {
        await db.runAsync(
          `INSERT INTO product_attribute_values (id, server_id, attribute_id, value, display_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            valueData.id,
            attributeId,
            valueData.value,
            valueData.display_order || 0,
            valueData.created_at || now,
            now,
          ],
        );
      }
    } catch (error) {
      console.error(`❌ Error saving attribute value:`, error);
    }
  }

  // Helper method to save variant - FIXED VERSION
  async saveVariant(db, variantData, productId, userId) {
    try {
      const existingVariant = await db.getFirstAsync(
        "SELECT id FROM product_variants WHERE server_id = ?",
        [variantData.id],
      );

      const now = new Date().toISOString();

      // Handle empty SKU - set to NULL instead of empty string
      let sku = variantData.sku;
      if (!sku || sku.trim() === "") {
        sku = null;
      }

      // Handle empty barcode - set to NULL instead of empty string
      let barcode = variantData.barcode;
      if (!barcode || barcode.trim() === "") {
        barcode = null;
      }

      // Check for duplicate SKU (only if not null)
      if (sku) {
        const duplicateSku = await db.getFirstAsync(
          "SELECT id FROM product_variants WHERE sku = ? AND id != COALESCE(?, '')",
          [sku, existingVariant?.id],
        );

        if (duplicateSku) {
          console.log(`⚠️ Duplicate SKU ${sku}, generating unique SKU`);
          // Generate a unique SKU by appending timestamp
          sku = `${sku}_${Date.now()}`;
        }
      }

      // Check for duplicate barcode (only if not null)
      if (barcode) {
        const duplicateBarcode = await db.getFirstAsync(
          "SELECT id FROM product_variants WHERE barcode = ? AND id != COALESCE(?, '')",
          [barcode, existingVariant?.id],
        );

        if (duplicateBarcode) {
          console.log(
            `⚠️ Duplicate barcode ${barcode}, generating unique barcode`,
          );
          // Generate a unique barcode by appending timestamp
          barcode = `${barcode}_${Date.now()}`;
        }
      }

      if (existingVariant) {
        // Update existing variant
        await db.runAsync(
          `UPDATE product_variants SET 
         product_id = ?, name = ?, sku = ?, barcode = ?, cost_price = ?,
         selling_price = ?, wholesale_price = ?, weight = ?, dimensions = ?,
         is_default = ?, is_active = ?, updated_at = ?
         WHERE server_id = ?`,
          [
            productId,
            variantData.name || "",
            sku, // Now could be null
            barcode, // Now could be null
            variantData.cost_price || null,
            variantData.selling_price || null,
            variantData.wholesale_price || null,
            variantData.weight || null,
            variantData.dimensions || null,
            variantData.is_default ? 1 : 0,
            1,
            now,
            variantData.id,
          ],
        );
      } else {
        // Insert new variant
        await db.runAsync(
          `INSERT INTO product_variants (id, server_id, product_id, name, sku, barcode,
         cost_price, selling_price, wholesale_price, weight, dimensions,
         is_default, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            variantData.id,
            productId,
            variantData.name || "",
            sku, // Now could be null
            barcode, // Now could be null
            variantData.cost_price || null,
            variantData.selling_price || null,
            variantData.wholesale_price || null,
            variantData.weight || null,
            variantData.dimensions || null,
            variantData.is_default ? 1 : 0,
            1,
            variantData.created_at || now,
            now,
          ],
        );
        console.log(
          `✅ Saved variant: ${variantData.name || variantData.id} with sku: ${sku || "null"}, barcode: ${barcode || "null"}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error saving variant:`, error);

      // If still getting duplicate error, retry with null values
      if (
        error.message.includes(
          "UNIQUE constraint failed: product_variants.sku",
        ) ||
        error.message.includes(
          "UNIQUE constraint failed: product_variants.barcode",
        )
      ) {
        try {
          console.log("🔄 Retrying with null SKU and barcode...");
          await this.saveVariantWithNullValues(
            db,
            variantData,
            productId,
            userId,
          );
        } catch (retryError) {
          console.error("❌ Retry also failed:", retryError);
        }
      }
    }
  }

  // New helper method for retry with null values
  async saveVariantWithNullValues(db, variantData, productId, userId) {
    const now = new Date().toISOString();

    const existingVariant = await db.getFirstAsync(
      "SELECT id FROM product_variants WHERE server_id = ?",
      [variantData.id],
    );

    if (existingVariant) {
      // Update with null values
      await db.runAsync(
        `UPDATE product_variants SET 
       product_id = ?, name = ?, sku = NULL, barcode = NULL, cost_price = ?,
       selling_price = ?, wholesale_price = ?, weight = ?, dimensions = ?,
       is_default = ?, is_active = ?, updated_at = ?
       WHERE server_id = ?`,
        [
          productId,
          variantData.name || "",
          variantData.cost_price || null,
          variantData.selling_price || null,
          variantData.wholesale_price || null,
          variantData.weight || null,
          variantData.dimensions || null,
          variantData.is_default ? 1 : 0,
          1,
          now,
          variantData.id,
        ],
      );
    } else {
      // Insert with null values
      await db.runAsync(
        `INSERT INTO product_variants (id, server_id, product_id, name, sku, barcode,
       cost_price, selling_price, wholesale_price, weight, dimensions,
       is_default, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nanoid(),
          variantData.id,
          productId,
          variantData.name || "",
          variantData.cost_price || null,
          variantData.selling_price || null,
          variantData.wholesale_price || null,
          variantData.weight || null,
          variantData.dimensions || null,
          variantData.is_default ? 1 : 0,
          1,
          variantData.created_at || now,
          now,
        ],
      );
    }
    console.log(
      `✅ Saved variant with null SKU/barcode: ${variantData.name || variantData.id}`,
    );
  }

  // Helper method to update inventory
  async updateInventory(
    db,
    inventoryData,
    variantId,
    productId,
    shopId,
    userId,
  ) {
    try {
      const existingInventory = await db.getFirstAsync(
        "SELECT id FROM inventory WHERE server_id = ?",
        [inventoryData.id],
      );

      const now = new Date().toISOString();

      if (existingInventory) {
        await db.runAsync(
          `UPDATE inventory SET 
           product_id = ?, variant_id = ?, shop_id = ?, current_stock = ?,
           reserved_stock = ?, minimum_stock = ?, maximum_stock = ?,
           last_restocked = ?, is_active = ?, updated_at = ?
           WHERE server_id = ?`,
          [
            productId,
            variantId,
            shopId,
            inventoryData.current_stock || 0,
            inventoryData.reserved_stock || 0,
            inventoryData.minimum_stock || 0,
            inventoryData.maximum_stock || null,
            inventoryData.last_restocked || null,
            1,
            now,
            inventoryData.id,
          ],
        );
      } else {
        await db.runAsync(
          `INSERT INTO inventory (id, server_id, product_id, variant_id, shop_id,
           current_stock, reserved_stock, minimum_stock, maximum_stock,
           last_restocked, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            inventoryData.id,
            productId,
            variantId,
            shopId,
            inventoryData.current_stock || 0,
            inventoryData.reserved_stock || 0,
            inventoryData.minimum_stock || 0,
            inventoryData.maximum_stock || null,
            inventoryData.last_restocked || null,
            1,
            inventoryData.created_at || now,
            now,
          ],
        );
      }
    } catch (error) {
      console.error(`❌ Error updating inventory:`, error);
    }
  }

  // Helper method to get business by server ID
  async getBusinessByServerId(db, serverId) {
    try {
      return await db.getFirstAsync(
        "SELECT id FROM businesses WHERE server_id = ?",
        [serverId],
      );
    } catch (error) {
      console.error(
        `❌ Error getting business by server ID ${serverId}:`,
        error,
      );
      return null;
    }
  }

  // Helper method to get product by server ID
  async getProductByServerId(db, serverId) {
    try {
      return await db.getFirstAsync(
        "SELECT id FROM products WHERE server_id = ?",
        [serverId],
      );
    } catch (error) {
      console.error(
        `❌ Error getting product by server ID ${serverId}:`,
        error,
      );
      return null;
    }
  }

  // Helper method to get attribute by server ID
  async getAttributeByServerId(db, serverId) {
    try {
      return await db.getFirstAsync(
        "SELECT id FROM product_attributes WHERE server_id = ?",
        [serverId],
      );
    } catch (error) {
      console.error(
        `❌ Error getting attribute by server ID ${serverId}:`,
        error,
      );
      return null;
    }
  }

  // Helper method to get variant by server ID
  async getVariantByServerId(db, serverId) {
    try {
      return await db.getFirstAsync(
        "SELECT id FROM product_variants WHERE server_id = ?",
        [serverId],
      );
    } catch (error) {
      console.error(
        `❌ Error getting variant by server ID ${serverId}:`,
        error,
      );
      return null;
    }
  }

  // Helper method to get shop by server ID
  async getShopByServerId(db, serverId) {
    try {
      return await db.getFirstAsync(
        "SELECT id FROM shops WHERE server_id = ?",
        [serverId],
      );
    } catch (error) {
      console.error(`❌ Error getting shop by server ID ${serverId}:`, error);
      return null;
    }
  }

  // Helper method to set user setting
  async setUserSetting(db, userId, key, value) {
    try {
      const now = new Date().toISOString();
      const existingSetting = await db.getFirstAsync(
        "SELECT id FROM user_settings WHERE user_id = ? AND setting_key = ?",
        [userId, key],
      );

      if (existingSetting) {
        await db.runAsync(
          "UPDATE user_settings SET setting_value = ?, updated_at = ? WHERE id = ?",
          [value, now, existingSetting.id],
        );
      } else {
        await db.runAsync(
          "INSERT INTO user_settings (id, user_id, setting_key, setting_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [nanoid(), userId, key, value, now, now],
        );
      }
    } catch (error) {
      console.error(`❌ Error setting user setting ${key}:`, error);
    }
  }

  // Incremental sync - get only changes since last sync
  async incrementalSync(userId, authToken, apiUrl) {
    try {
      if (this.isSyncing) {
        return { success: false, error: "Sync already in progress" };
      }

      this.isSyncing = true;
      console.log("🔄 Starting incremental product sync...");

      // Get last sync time
      const db = await databaseService.openDatabase();
      const lastSyncResult = await db.getFirstAsync(
        "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
        [userId, "last_product_sync"],
      );

      const lastSync = lastSyncResult?.setting_value;

      if (!lastSync) {
        // First time sync, do full download
        this.isSyncing = false;
        return await this.downloadAllProductData(userId, authToken, apiUrl);
      }

      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        this.isSyncing = false;
        return { success: false, error: "Network not available for sync" };
      }

      const response = await axios.post(
        `${apiUrl}/products/sync/incremental/`,
        {
          last_sync: lastSync,
          requested_changes: {
            products: [], // Request product details for changed products
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 15000,
        },
      );

      if (response.data.success) {
        const syncData = response.data.data;
        const changes = syncData.changes;
        const deletions = syncData.deletions;

        console.log("📊 Incremental sync changes:", {
          changes: Object.keys(changes).reduce((acc, key) => {
            acc[key] = changes[key].length;
            return acc;
          }, {}),
          deletions: Object.keys(deletions).reduce((acc, key) => {
            acc[key] = deletions[key].length;
            return acc;
          }, {}),
        });

        // Process deletions first
        await this.processDeletions(deletions);

        // Process changes
        if (changes.products && changes.products.length > 0) {
          await this.fetchAndUpdateProducts(
            changes.products,
            userId,
            authToken,
            apiUrl,
          );
        }

        // Update last sync time
        this.lastSyncTime = new Date().toISOString();
        await this.setUserSetting(
          db,
          userId,
          "last_product_sync",
          this.lastSyncTime,
        );

        console.log("✅ Incremental sync completed");
        this.isSyncing = false;
        return {
          success: true,
          changes: syncData,
          message: "Sync completed successfully",
        };
      } else {
        throw new Error(response.data.error || "Sync failed");
      }
    } catch (error) {
      console.error("❌ Incremental sync error:", error);
      this.isSyncing = false;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Process deletions
  async processDeletions(deletions) {
    const db = await databaseService.openDatabase();

    for (const [table, ids] of Object.entries(deletions)) {
      if (ids.length === 0) continue;

      console.log(`🗑️ Soft deleting ${ids.length} records from ${table}`);

      switch (table) {
        case "products":
          for (const id of ids) {
            await db.runAsync(
              "UPDATE products SET is_active = 0, updated_at = ? WHERE server_id = ?",
              [new Date().toISOString(), id],
            );
          }
          break;

        case "categories":
          for (const id of ids) {
            await db.runAsync(
              "UPDATE categories SET is_active = 0, updated_at = ? WHERE server_id = ?",
              [new Date().toISOString(), id],
            );
          }
          break;

        case "inventory":
          for (const id of ids) {
            // Get inventory record and mark as inactive
            await db.runAsync(
              "UPDATE inventory SET is_active = 0, updated_at = ? WHERE server_id = ?",
              [new Date().toISOString(), id],
            );
          }
          break;

        // Add other tables as needed
      }
    }
  }

  // Fetch and update specific products
  async fetchAndUpdateProducts(productIds, userId, authToken, apiUrl) {
    try {
      console.log(
        `📥 Fetching details for ${productIds.length} changed products`,
      );

      // In a real implementation, you would call an endpoint to get detailed product data
      // For now, we'll simulate by fetching each product individually
      for (const productId of productIds) {
        try {
          const response = await axios.get(`${apiUrl}/products/${productId}/`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (response.data.success) {
            const productData = response.data.product;
            const db = await databaseService.openDatabase();

            // Update local database
            const business = await this.getBusinessByServerId(
              db,
              productData.business_id,
            );
            if (business) {
              await this.syncProductFromServer(
                db,
                productData,
                business.id,
                userId,
              );
            }
          }
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error updating products:", error);
    }
  }

  // Check if sync is needed
  async checkSyncNeeded(userId) {
    try {
      const db = await databaseService.openDatabase();
      const lastSyncResult = await db.getFirstAsync(
        "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?",
        [userId, "last_product_sync"],
      );

      const lastSync = lastSyncResult?.setting_value;

      if (!lastSync) {
        return { needed: true, reason: "Never synced before" };
      }

      const lastSyncDate = new Date(lastSync);
      const now = new Date();
      const hoursSinceLastSync = (now - lastSyncDate) / (1000 * 60 * 60);

      // Sync if last sync was more than 1 hour ago
      if (hoursSinceLastSync > 1) {
        return {
          needed: true,
          reason: `Last sync was ${Math.round(hoursSinceLastSync)} hours ago`,
        };
      }

      return { needed: false, reason: "Recently synced" };
    } catch (error) {
      console.error("Error checking sync status:", error);
      return { needed: true, reason: "Error checking sync status" };
    }
  }

  // Get local product data statistics
  async getLocalProductStats(userId) {
    try {
      const db = await databaseService.openDatabase();

      const stats = {
        products: 0,
        categories: 0,
        variants: 0,
        inventory: 0,
        lastUpdated: null,
      };

      // Get counts
      const productCount = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM products WHERE is_active = 1",
      );
      stats.products = productCount?.count || 0;

      const categoryCount = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM categories WHERE is_active = 1",
      );
      stats.categories = categoryCount?.count || 0;

      const variantCount = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM product_variants WHERE is_active = 1",
      );
      stats.variants = variantCount?.count || 0;

      const inventoryCount = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM inventory WHERE is_active = 1",
      );
      stats.inventory = inventoryCount?.count || 0;

      // Get last update time
      const lastUpdate = await db.getFirstAsync(
        "SELECT MAX(updated_at) as last_updated FROM products WHERE is_active = 1",
      );
      stats.lastUpdated = lastUpdate?.last_updated || null;

      return stats;
    } catch (error) {
      console.error("Error getting product stats:", error);
      return null;
    }
  }
}

// Create singleton instance
const productSyncService = new ProductSyncService();
export default productSyncService;