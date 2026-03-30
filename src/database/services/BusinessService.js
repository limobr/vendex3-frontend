// src/database/services/BusinessService.js
import { BaseService } from './BaseService';

class BusinessService extends BaseService {
  constructor() {
    super();
  }

  // Create new business - ONLINE FIRST VERSION (for when you create on server first)
  async createBusinessFromServer(businessData) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();
      const businessId = businessData.id || this.generateId();
      
      // This is called AFTER successful server creation, so we have server_id
      if (!businessData.server_id) {
        console.warn('⚠️ Creating business from server without server_id');
      }

      // Validate required fields
      const errors = this.validateRequired(businessData, ['name', 'owner_id']);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Check if business already exists by server_id
      if (businessData.server_id) {
        const existing = await db.getFirstAsync(
          'SELECT id FROM businesses WHERE server_id = ?',
          [businessData.server_id]
        );
        
        if (existing) {
          // Update existing business
          await this.updateBusinessFromServer(existing.id, businessData);
          return { success: true, id: existing.id, action: 'updated' };
        }
      }

      // Insert new business with server_id already set
      await db.runAsync(
        `INSERT INTO businesses (
          id, server_id, owner_id, name, registration_number, phone_number, email, address,
          industry, business_type, tax_id, website, description, established_date,
          is_active, created_at, updated_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessId,
          businessData.server_id || null,
          businessData.owner_id,
          businessData.name,
          businessData.registration_number || '',
          businessData.phone_number || '',
          businessData.email || '',
          businessData.address || '',
          businessData.industry || '',
          businessData.business_type || '',
          businessData.tax_id || '',
          businessData.website || '',
          businessData.description || '',
          businessData.established_date || now,
          1,
          now,
          now,
          businessData.server_id ? 'synced' : 'pending', // Mark as synced if we have server_id
          businessData.server_id ? 0 : 1 // Not dirty if we have server_id
        ]
      );

      console.log('✅ Business saved from server:', businessId, businessData.server_id ? '(synced)' : '(pending)');
      return { success: true, id: businessId };
    } catch (error) {
      console.error('❌ Error creating business from server:', error);
      return { success: false, error: error.message };
    }
  }

  // Update business from server
  async updateBusinessFromServer(businessId, updates) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      const allowedFields = ['name', 'registration_number', 'phone_number', 'email', 'address', 
                            'industry', 'business_type', 'tax_id', 'website', 'description', 
                            'established_date', 'is_active', 'server_id'];
      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      });

      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      // When updating from server, mark as synced and not dirty
      updateFields.push('sync_status = ?, is_dirty = ?, updated_at = ?');
      updateValues.push('synced', 0, now);
      
      updateValues.push(businessId);

      const query = `
        UPDATE businesses 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await db.runAsync(query, updateValues);

      console.log('✅ Business updated from server:', businessId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating business from server:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all businesses for current user (owner) - UPDATED to use server_id for shop count
  async getBusinesses() {
    try {
      const db = await this.getDatabase();
      const businesses = await db.getAllAsync(
        'SELECT * FROM businesses WHERE is_active = 1 ORDER BY created_at DESC'
      );

      // For each business, get shop count using server_id
      for (let business of businesses) {
        let shopCount = 0;
        
        if (business.server_id) {
          // Use server_id to count shops (shops are stored with server business UUID)
          const result = await db.getFirstAsync(
            'SELECT COUNT(*) as count FROM shops WHERE business_id = ? AND is_active = 1',
            [business.server_id]
          );
          shopCount = result?.count || 0;
        } else {
          // Fallback to local ID
          const result = await db.getFirstAsync(
            'SELECT COUNT(*) as count FROM shops WHERE business_id = ? AND is_active = 1',
            [business.id]
          );
          shopCount = result?.count || 0;
        }
        
        business.shop_count = shopCount;
      }

      return businesses;
    } catch (error) {
      console.error('❌ Error getting businesses:', error);
      return [];
    }
  }

  // Get business by ID
  async getBusinessById(businessId) {
    try {
      const db = await this.getDatabase();
      const business = await db.getFirstAsync(
        'SELECT * FROM businesses WHERE id = ?',
        [businessId]
      );

      if (business) {
        // Get shops for this business using server_id if available
        let shops = [];
        
        if (business.server_id) {
          shops = await db.getAllAsync(
            'SELECT * FROM shops WHERE business_id = ? AND is_active = 1',
            [business.server_id]
          );
        } else {
          shops = await db.getAllAsync(
            'SELECT * FROM shops WHERE business_id = ? AND is_active = 1',
            [businessId]
          );
        }
        
        business.shops = shops;
        business.shop_count = shops.length;
      }

      return business;
    } catch (error) {
      console.error('❌ Error getting business:', error);
      return null;
    }
  }

  // Delete business (soft delete)
  async deleteBusiness(businessId) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      // Get business to see if it has server_id
      const business = await this.getBusinessById(businessId);
      
      // Soft delete business - mark as dirty if it has server_id (needs server sync)
      const isDirty = business?.server_id ? 1 : 0;
      
      await db.runAsync(
        `UPDATE businesses SET is_active = 0, updated_at = ?, sync_status = 'pending', is_dirty = ? WHERE id = ?`,
        [now, isDirty, businessId]
      );

      // Also soft delete all shops under this business
      let shopBusinessId = businessId;
      if (business?.server_id) {
        shopBusinessId = business.server_id;
      }
      
      await db.runAsync(
        `UPDATE shops SET is_active = 0, updated_at = ?, sync_status = 'pending', is_dirty = ? WHERE business_id = ?`,
        [now, isDirty, shopBusinessId]
      );

      console.log('✅ Business deleted:', businessId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting business:', error);
      return { success: false, error: error.message };
    }
  }

  // Search businesses
  async searchBusinesses(query) {
    try {
      const db = await this.getDatabase();
      const searchTerm = `%${query}%`;
      
      const businesses = await db.getAllAsync(
        `SELECT * FROM businesses 
         WHERE is_active = 1 
         AND (name LIKE ? OR registration_number LIKE ? OR email LIKE ?)
         ORDER BY name`,
        [searchTerm, searchTerm, searchTerm]
      );

      return businesses;
    } catch (error) {
      console.error('❌ Error searching businesses:', error);
      return [];
    }
  }

  // Get business stats
  async getBusinessStats(businessId) {
    try {
      const db = await this.getDatabase();
      
      // Get business to check for server_id
      const business = await this.getBusinessById(businessId);
      let shopBusinessId = businessId;
      
      if (business?.server_id) {
        shopBusinessId = business.server_id;
      }
      
      // Get shop count
      const shopCount = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM shops WHERE business_id = ? AND is_active = 1',
        [shopBusinessId]
      );

      // Get employee count
      const employeeCount = await db.getFirstAsync(
        `SELECT COUNT(DISTINCT e.user_id) as count 
         FROM employees e
         INNER JOIN shops s ON e.shop_id = s.id
         WHERE s.business_id = ? AND e.is_active = 1`,
        [shopBusinessId]
      );

      // Get active shops
      const activeShops = await db.getAllAsync(
        'SELECT id, name FROM shops WHERE business_id = ? AND is_active = 1 LIMIT 5',
        [shopBusinessId]
      );

      return {
        shop_count: shopCount?.count || 0,
        employee_count: employeeCount?.count || 0,
        active_shops: activeShops
      };
    } catch (error) {
      console.error('❌ Error getting business stats:', error);
      return { shop_count: 0, employee_count: 0, active_shops: [] };
    }
  }

  // Get businesses pending sync - FIXED: Only get items without server_id
  async getPendingSyncBusinesses() {
    try {
      const db = await this.getDatabase();
      return await db.getAllAsync(
        "SELECT * FROM businesses WHERE (is_dirty = 1 OR sync_status = 'pending') AND server_id IS NULL"
      );
    } catch (error) {
      console.error('❌ Error getting pending sync businesses:', error);
      return [];
    }
  }

  // Mark business as synced
  async markAsSynced(localId, serverId) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();
      
      await db.runAsync(
        `UPDATE businesses SET 
          server_id = ?, 
          synced_at = ?, 
          updated_at = ?,
          is_dirty = 0, 
          sync_status = "synced" 
        WHERE id = ?`,
        [serverId, now, now, localId]
      );
      
      // Also update all shops for this business to use the server business ID
      await db.runAsync(
        `UPDATE shops SET business_id = ? WHERE business_id = ?`,
        [serverId, localId]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error marking business as synced:', error);
      return false;
    }
  }
}

export default new BusinessService();