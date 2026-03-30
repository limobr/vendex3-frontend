// src/database/simpleDatabase.js
import * as SQLite from 'expo-sqlite';
import { nanoid } from 'nanoid/non-secure';

// Open database
const openDatabase = () => {
  return SQLite.openDatabaseSync('vendex.db');
};

// Initialize database
export const initializeDatabase = async () => {
  try {
    const db = openDatabase();
    
    // Create tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        username TEXT NOT NULL,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        user_type TEXT NOT NULL,
        phone_number TEXT,
        is_verified INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending'
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        user_id TEXT NOT NULL,
        date_of_birth TEXT,
        fcm_token TEXT,
        pin_hash TEXT,
        profile_picture TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        offline_id TEXT UNIQUE,
        receipt_number TEXT,
        shop_id TEXT NOT NULL,
        attendant_id TEXT NOT NULL,
        customer_id TEXT,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        amount_paid REAL DEFAULT 0,
        change_given REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        sync_status TEXT DEFAULT 'pending',
        is_offline INTEGER DEFAULT 1,
        sale_date TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 1
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total_price REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        stock_deducted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 1,
        FOREIGN KEY (sale_id) REFERENCES sales (id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        sale_id TEXT NOT NULL,
        method TEXT DEFAULT 'cash',
        amount REAL DEFAULT 0,
        status TEXT DEFAULT 'completed',
        transaction_id TEXT,
        paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 1,
        FOREIGN KEY (sale_id) REFERENCES sales (id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        name TEXT NOT NULL,
        phone_number TEXT,
        email TEXT,
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 0
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// User operations
export const UserService = {
  saveUser: async (userData) => {
    const db = openDatabase();
    const userId = userData.id || nanoid();
    const now = new Date().toISOString();
    
    try {
      // Check if user exists
      const existingUser = await db.getFirstAsync(
        'SELECT id FROM users WHERE server_id = ? OR id = ?',
        [userData.server_id || userData.id, userId]
      );

      if (existingUser) {
        // Update user
        await db.runAsync(
          `UPDATE users SET 
            username = ?, email = ?, first_name = ?, last_name = ?,
            user_type = ?, phone_number = ?, is_verified = ?, is_active = ?,
            last_login = ?, updated_at = ?, synced_at = ?, is_dirty = 0
           WHERE id = ?`,
          [
            userData.username,
            userData.email || '',
            userData.first_name || '',
            userData.last_name || '',
            userData.user_type || 'employee',
            userData.phone_number || '',
            userData.is_verified ? 1 : 0,
            userData.is_active !== false ? 1 : 0,
            userData.last_login || now,
            now,
            now,
            existingUser.id
          ]
        );
        return { id: existingUser.id };
      } else {
        // Insert new user
        await db.runAsync(
          `INSERT INTO users (
            id, server_id, username, email, first_name, last_name,
            user_type, phone_number, is_verified, is_active, last_login,
            created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            userData.server_id || userData.id,
            userData.username,
            userData.email || '',
            userData.first_name || '',
            userData.last_name || '',
            userData.user_type || 'employee',
            userData.phone_number || '',
            userData.is_verified ? 1 : 0,
            userData.is_active !== false ? 1 : 0,
            userData.last_login || now,
            userData.created_at || now,
            userData.updated_at || now,
            now
          ]
        );
        return { id: userId };
      }
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    const db = openDatabase();
    try {
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1'
      );
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  updateUserLocal: async (userId, updates) => {
    const db = openDatabase();
    const now = new Date().toISOString();
    
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = [...Object.values(updates), now, userId];
      
      await db.runAsync(
        `UPDATE users SET ${setClause}, updated_at = ?, is_dirty = 1 WHERE id = ?`,
        values
      );
      
      // Add to sync queue
      const user = await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [userId]);
      await SyncQueueService.addToQueue('users', user.server_id || userId, 'update', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
};

// UserProfile operations
export const UserProfileService = {
  saveUserProfile: async (profileData) => {
    const db = openDatabase();
    const profileId = profileData.id || nanoid();
    const now = new Date().toISOString();
    
    try {
      // Check if profile exists for user
      const existingProfile = await db.getFirstAsync(
        'SELECT id FROM user_profiles WHERE user_id = ?',
        [profileData.user_id]
      );

      if (existingProfile) {
        // Update profile
        await db.runAsync(
          `UPDATE user_profiles SET 
            date_of_birth = ?, fcm_token = ?, pin_hash = ?, profile_picture = ?,
            updated_at = ?, synced_at = ?, is_dirty = 0
           WHERE id = ?`,
          [
            profileData.date_of_birth || '',
            profileData.fcm_token || '',
            profileData.pin_hash || '',
            profileData.profile_picture || '',
            now,
            now,
            existingProfile.id
          ]
        );
        return { id: existingProfile.id };
      } else {
        // Insert new profile
        await db.runAsync(
          `INSERT INTO user_profiles (
            id, server_id, user_id, date_of_birth, fcm_token, pin_hash,
            profile_picture, created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            profileId,
            profileData.server_id || profileData.id,
            profileData.user_id,
            profileData.date_of_birth || '',
            profileData.fcm_token || '',
            profileData.pin_hash || '',
            profileData.profile_picture || '',
            profileData.created_at || now,
            profileData.updated_at || now,
            now
          ]
        );
        return { id: profileId };
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  },

  getUserProfile: async (userId) => {
    const db = openDatabase();
    try {
      const profile = await db.getFirstAsync(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId]
      );
      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },
};

// Sale operations
export const SaleService = {
  createSale: async (saleData) => {
    const db = openDatabase();
    const saleId = saleData.id || nanoid();
    const offlineId = `offline_${nanoid()}`;
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        `INSERT INTO sales (
          id, server_id, offline_id, receipt_number, shop_id, attendant_id,
          customer_id, subtotal, tax_amount, discount_amount, total_amount,
          amount_paid, change_given, status, sync_status, is_offline,
          sale_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          saleData.server_id || null,
          offlineId,
          saleData.receipt_number || `OFFLINE_${offlineId}`,
          saleData.shop_id,
          saleData.attendant_id,
          saleData.customer_id || null,
          saleData.subtotal || 0,
          saleData.tax_amount || 0,
          saleData.discount_amount || 0,
          saleData.total_amount || 0,
          saleData.amount_paid || 0,
          saleData.change_given || 0,
          saleData.status || 'pending',
          'pending',
          1,
          saleData.sale_date || now,
          now,
          now
        ]
      );

      // Add sale items if provided
      if (saleData.items && saleData.items.length > 0) {
        for (const item of saleData.items) {
          await db.runAsync(
            `INSERT INTO sale_items (
              id, sale_id, product_id, quantity, unit_price, total_price,
              tax_amount, discount_amount, stock_deducted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              nanoid(),
              saleId,
              item.product_id,
              item.quantity || 1,
              item.unit_price || 0,
              item.total_price || (item.quantity * item.unit_price),
              item.tax_amount || 0,
              item.discount_amount || 0,
              item.stock_deducted ? 1 : 0,
              now
            ]
          );
        }
      }

      // Add payment if provided
      if (saleData.payment) {
        await db.runAsync(
          `INSERT INTO payments (
            id, sale_id, method, amount, status, transaction_id, paid_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            nanoid(),
            saleId,
            saleData.payment.method || 'cash',
            saleData.payment.amount || 0,
            saleData.payment.status || 'completed',
            saleData.payment.transaction_id || null,
            saleData.payment.paid_at || now
          ]
        );
      }

      // Add to sync queue
      const sale = await db.getFirstAsync('SELECT * FROM sales WHERE id = ?', [saleId]);
      await SyncQueueService.addToQueue('sales', offlineId, 'create', JSON.stringify(sale));

      return { id: saleId, offline_id: offlineId };
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },

  getPendingSales: async () => {
    const db = openDatabase();
    try {
      const sales = await db.getAllAsync(
        'SELECT * FROM sales WHERE sync_status = "pending" ORDER BY created_at ASC'
      );
      return sales;
    } catch (error) {
      console.error('Error getting pending sales:', error);
      return [];
    }
  },

  getUserSales: async (userId, limit = 50) => {
    const db = openDatabase();
    try {
      const sales = await db.getAllAsync(
        'SELECT * FROM sales WHERE attendant_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
      );
      return sales;
    } catch (error) {
      console.error('Error getting user sales:', error);
      return [];
    }
  },

  updateSaleStatus: async (saleId, status, serverId = null) => {
    const db = openDatabase();
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        `UPDATE sales SET 
          status = ?, sync_status = 'synced', synced_at = ?, is_dirty = 0,
          server_id = COALESCE(?, server_id)
         WHERE id = ?`,
        [status, now, serverId, saleId]
      );
      return true;
    } catch (error) {
      console.error('Error updating sale status:', error);
      return false;
    }
  },
};

// Customer operations
export const CustomerService = {
  saveCustomer: async (customerData) => {
    const db = openDatabase();
    const customerId = customerData.id || nanoid();
    const now = new Date().toISOString();
    
    try {
      // Check if customer exists
      const existingCustomer = await db.getFirstAsync(
        'SELECT id FROM customers WHERE server_id = ? OR phone_number = ?',
        [customerData.server_id || customerData.id, customerData.phone_number]
      );

      if (existingCustomer) {
        // Update customer
        await db.runAsync(
          `UPDATE customers SET 
            name = ?, phone_number = ?, email = ?, address = ?,
            loyalty_points = ?, total_spent = ?, is_active = ?,
            updated_at = ?, synced_at = ?, is_dirty = 0
           WHERE id = ?`,
          [
            customerData.name,
            customerData.phone_number || '',
            customerData.email || '',
            customerData.address || '',
            customerData.loyalty_points || 0,
            customerData.total_spent || 0,
            customerData.is_active !== false ? 1 : 0,
            now,
            now,
            existingCustomer.id
          ]
        );
        return { id: existingCustomer.id };
      } else {
        // Insert new customer
        await db.runAsync(
          `INSERT INTO customers (
            id, server_id, name, phone_number, email, address,
            loyalty_points, total_spent, is_active, created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            customerData.server_id || customerData.id,
            customerData.name,
            customerData.phone_number || '',
            customerData.email || '',
            customerData.address || '',
            customerData.loyalty_points || 0,
            customerData.total_spent || 0,
            customerData.is_active !== false ? 1 : 0,
            customerData.created_at || now,
            customerData.updated_at || now,
            now
          ]
        );
        return { id: customerId };
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      throw error;
    }
  },

  searchCustomers: async (searchTerm) => {
    const db = openDatabase();
    try {
      const customers = await db.getAllAsync(
        `SELECT * FROM customers 
         WHERE name LIKE ? OR phone_number LIKE ? OR email LIKE ?
         ORDER BY name LIMIT 50`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
      );
      return customers;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  },

  getAllCustomers: async () => {
    const db = openDatabase();
    try {
      const customers = await db.getAllAsync(
        'SELECT * FROM customers WHERE is_active = 1 ORDER BY name'
      );
      return customers;
    } catch (error) {
      console.error('Error getting all customers:', error);
      return [];
    }
  },
};

// Sync Queue operations
export const SyncQueueService = {
  addToQueue: async (tableName, recordId, operation, data) => {
    const db = openDatabase();
    const queueId = nanoid();
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        `INSERT INTO sync_queue (
          id, table_name, record_id, operation, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [queueId, tableName, recordId, operation, data, now, now]
      );
      return { id: queueId };
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  },

  getPendingSyncItems: async (limit = 50) => {
    const db = openDatabase();
    try {
      const items = await db.getAllAsync(
        'SELECT * FROM sync_queue WHERE status = "pending" ORDER BY created_at ASC LIMIT ?',
        [limit]
      );
      return items;
    } catch (error) {
      console.error('Error getting pending sync items:', error);
      return [];
    }
  },

  markAsProcessing: async (itemId) => {
    const db = openDatabase();
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        'UPDATE sync_queue SET status = "processing", last_attempt = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?',
        [now, now, itemId]
      );
      return true;
    } catch (error) {
      console.error('Error marking as processing:', error);
      return false;
    }
  },

  markAsCompleted: async (itemId) => {
    const db = openDatabase();
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        'UPDATE sync_queue SET status = "completed", updated_at = ? WHERE id = ?',
        [now, itemId]
      );
      return true;
    } catch (error) {
      console.error('Error marking as completed:', error);
      return false;
    }
  },

  markAsFailed: async (itemId, errorMessage) => {
    const db = openDatabase();
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        'UPDATE sync_queue SET status = "failed", error_message = ?, updated_at = ? WHERE id = ?',
        [errorMessage, now, itemId]
      );
      return true;
    } catch (error) {
      console.error('Error marking as failed:', error);
      return false;
    }
  },
};

// Initialize database on app start
export const initDatabase = async () => {
  try {
    const db = await initializeDatabase();
    console.log('📊 Database ready');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return null;
  }
};

// Export all services
export default {
  UserService,
  UserProfileService,
  SaleService,
  CustomerService,
  SyncQueueService,
  initDatabase,
};