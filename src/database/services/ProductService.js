// src/database/services/ProductService.js
import { BaseService } from './BaseService';

class ProductService extends BaseService {
  constructor() {
    super();
  }

  // ====================== Existing methods (from previous version) ======================
  // These methods are already present in the user's codebase.
  // We'll keep them for completeness.

  async createProduct(productData, userId) {
    // ... (existing implementation)
  }

  async getProductsByBusiness(businessId, userId, options = {}) {
    // ... (existing implementation)
  }

  async getProductById(productId, userId) {
    // ... (existing implementation)
  }

  async getProductWithDetails(productId, userId) {
    // ... (existing implementation)
  }

  async updateProduct(productId, updates, userId) {
    // ... (existing implementation)
  }

  async deleteProduct(productId, userId) {
    // ... (existing implementation)
  }

  async searchProducts(businessId, userId, query, options = {}) {
    // ... (existing implementation)
  }

  async getPendingSyncProducts() {
    // ... (existing implementation)
  }

  async markAsSynced(localId, serverId) {
    // ... (existing implementation)
  }

  async syncProductFromServer(productData, userId) {
    // ... (existing implementation)
  }

  // ====================== New methods for restocking ======================

  /**
   * Get all active products for a specific shop, with current stock.
   * For simple products: includes current_stock directly.
   * For variant products: includes a 'variants' array with each variant's current_stock.
   */
  async getProductsWithInventoryForShop(shopId) {
    try {
      const db = await this.getDatabase();

      // Get shop's business info to filter products correctly
      const shop = await db.getFirstAsync(
        'SELECT business_id, business_server_id FROM shops WHERE id = ?',
        [shopId]
      );
      if (!shop) throw new Error('Shop not found');

      // Build business condition (match either local ID or server ID)
      const businessCondition = shop.business_server_id
        ? `(p.business_id = ? OR p.business_server_id = ?)`
        : `p.business_id = ?`;
      const businessParams = shop.business_server_id
        ? [shop.business_id, shop.business_server_id]
        : [shop.business_id];

      // Fetch all active products for this business
      const products = await db.getAllAsync(`
        SELECT 
          p.id, p.server_id, p.name, p.description, p.category_id,
          p.has_variants, p.variant_type, p.base_sku, p.base_barcode,
          p.reorder_level, p.is_active,
          -- For simple product, get current stock from inventory
          (SELECT current_stock FROM inventory 
           WHERE product_id = p.id AND shop_id = ? AND is_active = 1) as current_stock
        FROM products p
        WHERE p.is_active = 1 AND ${businessCondition}
        ORDER BY p.name
      `, [shopId, ...businessParams]);

      // For products with variants, fetch variants and their stock
      for (const product of products) {
        if (product.has_variants) {
          const variants = await db.getAllAsync(`
            SELECT 
              v.id, v.server_id, v.name, v.sku, v.barcode, v.is_default, v.is_active,
              (SELECT current_stock FROM inventory 
               WHERE variant_id = v.id AND shop_id = ? AND is_active = 1) as current_stock
            FROM product_variants v
            WHERE v.product_id = ? AND v.is_active = 1
            ORDER BY v.is_default DESC, v.name
          `, [shopId, product.id]);
          product.variants = variants;
        } else {
          product.variants = [];
        }
      }

      return products;
    } catch (error) {
      console.error('❌ Error in getProductsWithInventoryForShop:', error);
      throw error;
    }
  }

  /**
   * Save products and inventory from server response.
   * Updates local tables: products, product_variants, inventory.
   */
  async saveProductsFromServer(serverProducts, shopId) {
    const db = await this.getDatabase();
    await db.execAsync('BEGIN TRANSACTION');
    try {
      // Get shop info for linking
      const shop = await db.getFirstAsync(
        'SELECT id, business_id, business_server_id FROM shops WHERE id = ?',
        [shopId]
      );
      if (!shop) throw new Error('Shop not found for sync');

      for (const sp of serverProducts) {
        const productId = sp.id; // server UUID
        const existingProduct = await db.getFirstAsync(
          'SELECT id FROM products WHERE server_id = ?',
          [productId]
        );

        const businessId = shop.business_id;
        const businessServerId = sp.business_id; // server's business UUID
        const now = this.getCurrentTimestamp();

        if (!existingProduct) {
          // Insert product
          await db.runAsync(`
            INSERT INTO products (
              id, server_id, business_id, business_server_id, name, description,
              category_id, product_type, has_variants, variant_type, base_barcode,
              base_sku, base_cost_price, base_selling_price, base_wholesale_price,
              tax_id, tax_inclusive, unit_of_measure, reorder_level, is_trackable,
              is_active, created_at, updated_at, sync_status, is_dirty
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            this.generateId(), productId, businessId, businessServerId,
            sp.name, sp.description || '',
            sp.category_id, sp.product_type,
            sp.has_variants ? 1 : 0, sp.variant_type || 'none',
            sp.base_barcode || null, sp.base_sku || null,
            sp.base_cost_price, sp.base_selling_price, sp.base_wholesale_price,
            sp.tax_id, sp.tax_inclusive ? 1 : 0, sp.unit_of_measure || 'pcs',
            sp.reorder_level || 10, sp.is_trackable ? 1 : 0,
            sp.is_active ? 1 : 0, sp.created_at, sp.updated_at,
            'synced', 0
          ]);
        } else {
          // Update product
          await db.runAsync(`
            UPDATE products SET
              name = ?, description = ?, category_id = ?, product_type = ?,
              has_variants = ?, variant_type = ?, base_barcode = ?, base_sku = ?,
              base_cost_price = ?, base_selling_price = ?, base_wholesale_price = ?,
              tax_id = ?, tax_inclusive = ?, unit_of_measure = ?, reorder_level = ?,
              is_trackable = ?, is_active = ?, updated_at = ?, sync_status = ?, is_dirty = 0
            WHERE server_id = ?
          `, [
            sp.name, sp.description || '',
            sp.category_id, sp.product_type,
            sp.has_variants ? 1 : 0, sp.variant_type || 'none',
            sp.base_barcode || null, sp.base_sku || null,
            sp.base_cost_price, sp.base_selling_price, sp.base_wholesale_price,
            sp.tax_id, sp.tax_inclusive ? 1 : 0, sp.unit_of_measure || 'pcs',
            sp.reorder_level || 10, sp.is_trackable ? 1 : 0,
            sp.is_active ? 1 : 0, sp.updated_at, 'synced',
            productId
          ]);
        }

        // Handle variants and inventory
        if (sp.has_variants && sp.variants) {
          for (const sv of sp.variants) {
            const variantId = sv.id;
            const existingVariant = await db.getFirstAsync(
              'SELECT id FROM product_variants WHERE server_id = ?',
              [variantId]
            );

            if (!existingVariant) {
              await db.runAsync(`
                INSERT INTO product_variants (
                  id, server_id, product_id, name, sku, barcode, cost_price,
                  selling_price, wholesale_price, weight, dimensions,
                  is_default, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                this.generateId(), variantId, productId,
                sv.name, sv.sku || null, sv.barcode || null,
                sv.cost_price, sv.selling_price, sv.wholesale_price,
                sv.weight, sv.dimensions,
                sv.is_default ? 1 : 0, sv.is_active ? 1 : 0,
                sv.created_at, sv.updated_at
              ]);
            } else {
              await db.runAsync(`
                UPDATE product_variants SET
                  name = ?, sku = ?, barcode = ?, cost_price = ?, selling_price = ?,
                  wholesale_price = ?, weight = ?, dimensions = ?, is_default = ?,
                  is_active = ?, updated_at = ?
                WHERE server_id = ?
              `, [
                sv.name, sv.sku || null, sv.barcode || null,
                sv.cost_price, sv.selling_price,
                sv.wholesale_price, sv.weight, sv.dimensions,
                sv.is_default ? 1 : 0, sv.is_active ? 1 : 0,
                sv.updated_at, variantId
              ]);
            }

            const currentStock = sv.inventory?.current_stock || 0;
            await this._upsertInventory(db, null, variantId, shopId, currentStock, sp.reorder_level);
          }
        } else {
          // Simple product: update its inventory
          const currentStock = sp.inventory?.current_stock || 0;
          await this._upsertInventory(db, productId, null, shopId, currentStock, sp.reorder_level);
        }
      }

      await db.execAsync('COMMIT');
      console.log('✅ Products saved from server');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      console.error('❌ Error saving products from server:', error);
      throw error;
    }
  }

  /**
   * Helper to upsert inventory record for a product or variant.
   */
  async _upsertInventory(db, productId, variantId, shopId, currentStock, reorderLevel) {
    const now = this.getCurrentTimestamp();

    if (productId) {
      const existing = await db.getFirstAsync(
        'SELECT id FROM inventory WHERE product_id = ? AND shop_id = ? AND is_active = 1',
        [productId, shopId]
      );
      if (existing) {
        await db.runAsync(`
          UPDATE inventory SET current_stock = ?, last_updated = ? WHERE id = ?
        `, [currentStock, now, existing.id]);
      } else {
        await db.runAsync(`
          INSERT INTO inventory (
            id, product_id, shop_id, current_stock, reserved_stock, minimum_stock,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          this.generateId(), productId, shopId, currentStock, 0, reorderLevel || 0,
          1, now, now
        ]);
      }
    } else if (variantId) {
      const existing = await db.getFirstAsync(
        'SELECT id FROM inventory WHERE variant_id = ? AND shop_id = ? AND is_active = 1',
        [variantId, shopId]
      );
      if (existing) {
        await db.runAsync(`
          UPDATE inventory SET current_stock = ?, last_updated = ? WHERE id = ?
        `, [currentStock, now, existing.id]);
      } else {
        await db.runAsync(`
          INSERT INTO inventory (
            id, variant_id, shop_id, current_stock, reserved_stock, minimum_stock,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          this.generateId(), variantId, shopId, currentStock, 0, reorderLevel || 0,
          1, now, now
        ]);
      }
    }
  }

  /**
   * Update inventory after a successful restock.
   */
  async updateInventory(productId, variantId, shopId, newStock) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      if (productId) {
        await db.runAsync(`
            UPDATE inventory 
            SET current_stock = ?, updated_at = ?, last_restocked = ? 
            WHERE product_id = ? AND shop_id = ? AND is_active = 1
            `, [newStock, now, now, productId, shopId]);
      } else if (variantId) {
        await db.runAsync(`
            UPDATE inventory 
            SET current_stock = ?, updated_at = ?, last_restocked = ? 
            WHERE product_id = ? AND shop_id = ? AND is_active = 1
            `, [newStock, now, now, productId, shopId]);
      } else {
        throw new Error('Either productId or variantId must be provided');
      }
      console.log('✅ Inventory updated locally');
    } catch (error) {
      console.error('❌ Error updating inventory:', error);
      throw error;
    }
  }
}

export default new ProductService();