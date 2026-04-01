// src/database/services/ShopService.js
import { BaseService } from './BaseService';

class ShopService extends BaseService {
  constructor() {
    super();
  }

  // Create or update shop (works for both new shops and syncing from server)
  async createOrUpdateShop(shopData) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();
      
      // CRITICAL: Use server UUID as primary ID if available
      const shopId = shopData.server_id || shopData.id || this.generateId();
      
      // Check if shop already exists
      const existingShop = await db.getFirstAsync(
        'SELECT id FROM shops WHERE id = ? OR server_id = ?',
        [shopId, shopData.server_id || '']
      );
      
      if (existingShop) {
        // Update existing shop
        return await this.updateShop(existingShop.id, {
          ...shopData,
          server_id: shopData.server_id || existingShop.server_id,
          sync_status: 'synced',
          is_dirty: 0,
          updated_at: now,
        });
      }
      
      // Validate required fields
      const errors = this.validateRequired(shopData, ['business_id', 'name', 'shop_type', 'location']);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Insert new shop with UUID as primary ID and both business_id and business_server_id
      await db.runAsync(
        `INSERT INTO shops (
          id, server_id, business_id, business_server_id, name, shop_type, location, 
          phone_number, email, tax_rate, currency, 
          is_active, created_at, updated_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shopId,                                    // Use UUID as primary ID
          shopData.server_id || shopId,              // Also store in server_id
          shopData.business_id,                      // Local business ID
          shopData.business_server_id || null,       // Server business UUID
          shopData.name,
          shopData.shop_type || 'retail',
          shopData.location,
          shopData.phone_number || '',
          shopData.email || '',
          parseFloat(shopData.tax_rate) || 0.0,
          shopData.currency || 'KES',
          shopData.is_active !== undefined ? (shopData.is_active ? 1 : 0) : 1,
          shopData.created_at || now,
          shopData.updated_at || now,
          shopData.sync_status || (shopData.server_id ? 'synced' : 'pending'),
          shopData.is_dirty !== undefined ? shopData.is_dirty : (shopData.server_id ? 0 : 1)
        ]
      );

      console.log('✅ Shop saved locally with ID:', shopId);
      return { success: true, id: shopId };
    } catch (error) {
      console.error('❌ Error creating/updating shop:', error);
      return { success: false, error: error.message };
    }
  }

  // Create new shop - ALIAS for createOrUpdateShop
  async createShop(shopData) {
    return await this.createOrUpdateShop(shopData);
  }

  // Update shop
  async updateShop(shopId, updates) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      // Only allow updates to Django model fields plus business_server_id
      const allowedFields = ['name', 'shop_type', 'location', 'phone_number', 'email', 
                            'tax_rate', 'currency', 'is_active', 'server_id', 
                            'business_server_id', 'sync_status', 'is_dirty'];
      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          updateFields.push(`${field} = ?`);
          // Handle tax rate conversion
          if (field === 'tax_rate') {
            updateValues.push(parseFloat(updates[field]) || 0.0);
          } else if (field === 'is_active') {
            updateValues.push(updates[field] ? 1 : 0);
          } else {
            updateValues.push(updates[field]);
          }
        }
      });

      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      // Always update the timestamp
      updateFields.push('updated_at = ?');
      updateValues.push(now);

      updateValues.push(shopId);

      const query = `
        UPDATE shops 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await db.runAsync(query, updateValues);

      // Get updated shop
      const updatedShop = await this.getShopById(shopId);
      
      console.log('✅ Shop updated:', shopId);
      return { 
        success: true, 
        shop: updatedShop 
      };
    } catch (error) {
      console.error('❌ Error updating shop:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all shops for business (by local business ID, enhanced to also match business_server_id)
  async getShopsByBusiness(businessId) {
    try {
      const db = await this.getDatabase();
      // First, get the business to find its server ID
      const business = await db.getFirstAsync(
        'SELECT id, server_id FROM businesses WHERE id = ?',
        [businessId]
      );
      
      let shops = [];
      if (business && business.server_id) {
        // Query using both business_id (local) and business_server_id (server)
        shops = await db.getAllAsync(
          `SELECT * FROM shops 
           WHERE (business_id = ? OR business_server_id = ?) AND is_active = 1 
           ORDER BY created_at DESC`,
          [businessId, business.server_id]
        );
      } else {
        // Fallback: only by local business_id
        shops = await db.getAllAsync(
          `SELECT * FROM shops 
           WHERE business_id = ? AND is_active = 1 
           ORDER BY created_at DESC`,
          [businessId]
        );
      }

      // For each shop, get employee count
      for (let shop of shops) {
        const employeeCount = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1',
          [shop.id]
        );
        shop.employee_count = employeeCount?.count || 0;
      }

      return shops;
    } catch (error) {
      console.error('❌ Error getting shops:', error);
      return [];
    }
  }

  // Get shops by business server UUID (for foreign key relationships)
  async getShopsByBusinessServerId(businessServerId) {
    try {
      const db = await this.getDatabase();
      const shops = await db.getAllAsync(
        `SELECT * FROM shops 
         WHERE business_server_id = ? AND is_active = 1 
         ORDER BY created_at DESC`,
        [businessServerId]
      );

      // For each shop, get employee count
      for (let shop of shops) {
        const employeeCount = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1',
          [shop.id]
        );
        shop.employee_count = employeeCount?.count || 0;
      }

      return shops;
    } catch (error) {
      console.error('❌ Error getting shops by server ID:', error);
      return [];
    }
  }

  // Get shop by ID (WORKS OFFLINE)
  async getShopById(shopId) {
    try {
      const db = await this.getDatabase();
      const shop = await db.getFirstAsync(
        'SELECT * FROM shops WHERE id = ?',
        [shopId]
      );

      if (shop) {
        // Get business info - try both local and server ID matching
        const business = await db.getFirstAsync(
          'SELECT name, server_id FROM businesses WHERE id = ? OR server_id = ?',
          [shop.business_id, shop.business_server_id || shop.business_id]
        );
        shop.business_name = business?.name || '';
        shop.business_server_id = business?.server_id || shop.business_server_id;

        // Get employee count
        const employeeCount = await db.getFirstAsync(
          'SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1',
          [shopId]
        );
        shop.employee_count = employeeCount?.count || 0;
      }

      return shop;
    } catch (error) {
      console.error('❌ Error getting shop:', error);
      return null;
    }
  }

  // Get shop by server ID (for API operations)
  async getShopByServerId(serverId) {
    try {
      const db = await this.getDatabase();
      const shop = await db.getFirstAsync(
        'SELECT * FROM shops WHERE server_id = ?',
        [serverId]
      );

      return shop;
    } catch (error) {
      console.error('❌ Error getting shop by server ID:', error);
      return null;
    }
  }

  // Delete shop (soft delete)
  async deleteShop(shopId) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      // Soft delete shop (matching Django soft delete)
      await db.runAsync(
        `UPDATE shops SET is_active = 0, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [now, shopId]
      );

      console.log('✅ Shop deleted locally:', shopId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting shop:', error);
      return { success: false, error: error.message };
    }
  }

  // Get shops pending sync
  async getPendingSyncShops() {
    try {
      const db = await this.getDatabase();
      return await db.getAllAsync(
        'SELECT * FROM shops WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error('❌ Error getting pending sync shops:', error);
      return [];
    }
  }

  // Mark shop as synced
  async markAsSynced(localId, serverId) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();
      
      await db.runAsync(
        `UPDATE shops SET 
          server_id = ?, 
          synced_at = ?, 
          updated_at = ?,
          is_dirty = 0, 
          sync_status = "synced" 
        WHERE id = ?`,
        [serverId, now, now, localId]
      );
      return true;
    } catch (error) {
      console.error('❌ Error marking shop as synced:', error);
      return false;
    }
  }

  // Set current shop (WORKS OFFLINE)
  async setCurrentShop(shopId) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      // First, get the shop to find its business
      const shop = await this.getShopById(shopId);
      if (!shop) {
        throw new Error('Shop not found');
      }

      // Reset all shops to not current
      await db.runAsync(
        'UPDATE shops SET is_current = 0'
      );

      // Set selected shop as current
      await db.runAsync(
        'UPDATE shops SET is_current = 1, updated_at = ? WHERE id = ?',
        [now, shopId]
      );

      console.log('✅ Current shop set:', shopId);
      return true;
    } catch (error) {
      console.error('❌ Error setting current shop:', error);
      return false;
    }
  }

  // Get current shop (WORKS OFFLINE)
  async getCurrentShop() {
    try {
      const db = await this.getDatabase();
      const shop = await db.getFirstAsync(
        'SELECT * FROM shops WHERE is_current = 1 AND is_active = 1 LIMIT 1'
      );

      return shop;
    } catch (error) {
      console.error('❌ Error getting current shop:', error);
      return null;
    }
  }
}

export default new ShopService();