// src/database/index.js
import * as SQLite from "expo-sqlite";
import { nanoid } from "nanoid/non-secure";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as uuid from "uuid";

// Database instance
let database = null;

// Open database
export const openDatabase = async () => {
  try {
    if (!database) {
      database = SQLite.openDatabaseSync("vendex.db");
      console.log("✅ Database opened successfully");
    }
    return database;
  } catch (error) {
    console.error("❌ Error opening database:", error);
    throw error;
  }
};

// Helper function to ensure string ID
const ensureStringId = (id) => {
  if (id === null || id === undefined) return null;
  return String(id);
};

// Helper function to ensure all IDs in data are strings
const normalizeIds = (data) => {
  if (!data || typeof data !== "object") return data;

  const normalized = { ...data };
  // Convert common ID fields to strings
  if (normalized.id !== undefined) normalized.id = ensureStringId(normalized.id);
  if (normalized.server_id !== undefined)
    normalized.server_id = ensureStringId(normalized.server_id);
  if (normalized.user_id !== undefined)
    normalized.user_id = ensureStringId(normalized.user_id);
  if (normalized.business_id !== undefined)
    normalized.business_id = ensureStringId(normalized.business_id);
  if (normalized.shop_id !== undefined)
    normalized.shop_id = ensureStringId(normalized.shop_id);
  if (normalized.product_id !== undefined)
    normalized.product_id = ensureStringId(normalized.product_id);
  if (normalized.category_id !== undefined)
    normalized.category_id = ensureStringId(normalized.category_id);
  if (normalized.customer_id !== undefined)
    normalized.customer_id = ensureStringId(normalized.customer_id);
  if (normalized.sale_id !== undefined)
    normalized.sale_id = ensureStringId(normalized.sale_id);
  if (normalized.role_id !== undefined)
    normalized.role_id = ensureStringId(normalized.role_id);
  if (normalized.employee_id !== undefined)
    normalized.employee_id = ensureStringId(normalized.employee_id);
  if (normalized.tax_id !== undefined)
    normalized.tax_id = ensureStringId(normalized.tax_id);
  if (normalized.parent_id !== undefined)
    normalized.parent_id = ensureStringId(normalized.parent_id);
  if (normalized.attribute_id !== undefined)
    normalized.attribute_id = ensureStringId(normalized.attribute_id);
  if (normalized.variant_id !== undefined)
    normalized.variant_id = ensureStringId(normalized.variant_id);
  if (normalized.created_by !== undefined)
    normalized.created_by = ensureStringId(normalized.created_by);
  if (normalized.changed_by !== undefined)
    normalized.changed_by = ensureStringId(normalized.changed_by);
  if (normalized.inventory_id !== undefined)
    normalized.inventory_id = ensureStringId(normalized.inventory_id);
  if (normalized.performed_by !== undefined)
    normalized.performed_by = ensureStringId(normalized.performed_by);

  return normalized;
};

// Initialize database schema
export const initializeDatabase = async () => {
  try {
    const db = await openDatabase();

    // Create users table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        user_type TEXT NOT NULL DEFAULT 'employee',
        phone_number TEXT,
        is_verified INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        date_joined TEXT,
        profile_picture TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending'
      );
    `);

    // Create user_profiles table (updated with onboarding flags)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        user_id TEXT NOT NULL UNIQUE,
        date_of_birth TEXT,
        fcm_token TEXT,
        pin_hash TEXT,
        profile_picture TEXT,
        server_profile_picture TEXT,
        local_profile_picture TEXT,
        preferences TEXT DEFAULT '{}',
        has_changed_temp_password INTEGER DEFAULT 0,
        is_first_login_complete INTEGER DEFAULT 0,
        onboarding_completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create businesses table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        registration_number TEXT,
        phone_number TEXT,
        email TEXT,
        address TEXT,
        industry TEXT,
        business_type TEXT,
        tax_id TEXT,
        website TEXT,
        description TEXT,
        established_date TEXT,
        color TEXT DEFAULT '#FF6B00',
        icon TEXT DEFAULT 'business',
        is_active INTEGER DEFAULT 1,
        is_current INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create shops table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        business_id TEXT NOT NULL,
        business_server_id TEXT,
        name TEXT NOT NULL,
        shop_type TEXT DEFAULT 'retail',
        location TEXT,
        phone_number TEXT,
        email TEXT,
        manager_id TEXT,
        tax_rate REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'KES',
        monthly_sales REAL DEFAULT 0.0,
        employee_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        is_current INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (manager_id) REFERENCES users (id)
      );
    `);

    // Create roles table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        name TEXT NOT NULL,
        role_type TEXT,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0
      );
    `);

    // Create employees table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        user_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        shop_id TEXT,
        role_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone_number TEXT,
        employment_type TEXT DEFAULT 'full_time',
        salary REAL,
        is_active INTEGER DEFAULT 1,
        employment_date TEXT,
        termination_date TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
      );
    `);

    // Create taxes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS taxes (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        name TEXT NOT NULL,
        rate REAL DEFAULT 0.0,
        tax_type TEXT NOT NULL DEFAULT 'standard',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0
      );
    `);

    // Create categories table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        business_id TEXT NOT NULL,
        business_server_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT,
        color TEXT DEFAULT '#FF6B35',
        image TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
      );
    `);

    // Create products table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        business_id TEXT NOT NULL,
        business_server_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        category_id TEXT,
        product_type TEXT DEFAULT 'physical',
        has_variants INTEGER DEFAULT 0,
        variant_type TEXT DEFAULT 'none',
        base_barcode TEXT UNIQUE,
        base_sku TEXT UNIQUE,
        base_cost_price REAL,
        base_selling_price REAL,
        base_wholesale_price REAL,
        tax_id TEXT,
        tax_inclusive INTEGER DEFAULT 1,
        unit_of_measure TEXT DEFAULT 'pcs',
        reorder_level INTEGER DEFAULT 10,
        is_trackable INTEGER DEFAULT 1,
        image TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
        FOREIGN KEY (tax_id) REFERENCES taxes (id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      );
    `);

    // Create product_attributes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_attributes (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_required INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        UNIQUE(product_id, name)
      );
    `);

    // Create product_attribute_values table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_attribute_values (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        attribute_id TEXT NOT NULL,
        value TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (attribute_id) REFERENCES product_attributes (id) ON DELETE CASCADE,
        UNIQUE(attribute_id, value)
      );
    `);

    // Create product_variants table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        product_id TEXT NOT NULL,
        name TEXT,
        sku TEXT UNIQUE,
        barcode TEXT UNIQUE,
        cost_price REAL,
        selling_price REAL,
        wholesale_price REAL,
        weight REAL,
        dimensions TEXT,
        image TEXT,
        is_active INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        UNIQUE(product_id, name)
      );
    `);

    // Create product_variant_attributes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_variant_attributes (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        variant_id TEXT NOT NULL,
        attribute_id TEXT NOT NULL,
        value_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
        FOREIGN KEY (attribute_id) REFERENCES product_attributes (id) ON DELETE CASCADE,
        FOREIGN KEY (value_id) REFERENCES product_attribute_values (id) ON DELETE CASCADE,
        UNIQUE(variant_id, attribute_id)
      );
    `);

    // Create inventory table (updated with last_movement and is_locked)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        product_id TEXT,
        variant_id TEXT,
        shop_id TEXT NOT NULL,
        current_stock INTEGER DEFAULT 0,
        reserved_stock INTEGER DEFAULT 0,
        minimum_stock INTEGER DEFAULT 0,
        maximum_stock INTEGER,
        last_restocked TEXT,
        last_movement TEXT,
        is_locked INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
        CHECK (
          (product_id IS NOT NULL AND variant_id IS NULL) OR
          (product_id IS NULL AND variant_id IS NOT NULL)
        )
      );
    `);

    // Create stock_movements table (NEW)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        inventory_id TEXT NOT NULL,
        shop_id TEXT NOT NULL,
        product_id TEXT,
        variant_id TEXT,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference TEXT,
        reason TEXT,
        performed_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
      );
    `);

    // Create indexes for stock_movements
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON stock_movements(inventory_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON stock_movements(shop_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
    `);

    // Create price_history table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS price_history (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        product_id TEXT,
        variant_id TEXT,
        old_price REAL DEFAULT 0.0,
        new_price REAL DEFAULT 0.0,
        price_type TEXT DEFAULT 'selling',
        change_reason TEXT,
        changed_by TEXT,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL,
        CHECK (
          (product_id IS NOT NULL AND variant_id IS NULL) OR
          (product_id IS NULL AND variant_id IS NOT NULL)
        )
      );
    `);

    // Create product_images table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        product_id TEXT,
        variant_id TEXT,
        image TEXT NOT NULL,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
        CHECK (
          (product_id IS NOT NULL AND variant_id IS NULL) OR
          (product_id IS NULL AND variant_id IS NOT NULL)
        )
      );
    `);

    // Create customers table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone_number TEXT,
        email TEXT,
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.0,
        preferences TEXT DEFAULT '{}',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
      );
    `);

    // Create sales table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        offline_id TEXT,
        receipt_number TEXT UNIQUE,
        shop_id TEXT NOT NULL,
        attendant_id TEXT NOT NULL,
        customer_id TEXT,
        subtotal REAL DEFAULT 0.0,
        tax_amount REAL DEFAULT 0.0,
        discount_amount REAL DEFAULT 0.0,
        total_amount REAL DEFAULT 0.0,
        amount_paid REAL DEFAULT 0.0,
        change_given REAL DEFAULT 0.0,
        status TEXT DEFAULT 'draft',
        sync_status TEXT DEFAULT 'pending',
        is_offline INTEGER DEFAULT 0,
        sale_date TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
        FOREIGN KEY (attendant_id) REFERENCES employees (id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
      );
    `);

    // Create sale_items table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        sale_id TEXT NOT NULL,
        product_id TEXT,
        variant_id TEXT,
        quantity REAL DEFAULT 1.0,
        unit_price REAL DEFAULT 0.0,
        total_price REAL DEFAULT 0.0,
        tax_amount REAL DEFAULT 0.0,
        discount_amount REAL DEFAULT 0.0,
        stock_deducted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
        FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL,
        CHECK (
          (product_id IS NOT NULL AND variant_id IS NULL) OR
          (product_id IS NULL AND variant_id IS NOT NULL)
        )
      );
    `);

    // Create payments table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        server_id TEXT,
        sale_id TEXT NOT NULL,
        method TEXT DEFAULT 'cash',
        amount REAL DEFAULT 0.0,
        status TEXT DEFAULT 'completed',
        transaction_id TEXT,
        paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_dirty INTEGER DEFAULT 0,
        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
      );
    `);

    // Create sync_logs table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        data_count INTEGER DEFAULT 0,
        start_time TEXT DEFAULT CURRENT_TIMESTAMP,
        end_time TEXT,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create app_settings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key)
      );
    `);

    // Create user_settings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, setting_key)
      );
    `);

    // Notifications table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        notification_type TEXT DEFAULT 'info',
        category TEXT DEFAULT 'general',
        is_read INTEGER DEFAULT 0,
        related_object_type TEXT,
        related_object_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Messages table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_name TEXT,
        recipient_id TEXT NOT NULL,
        recipient_name TEXT,
        business_id TEXT,
        business_name TEXT,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Configurations table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS configurations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL UNIQUE,
        primary_color TEXT DEFAULT '#667eea',
        secondary_color TEXT DEFAULT '#764ba2',
        accent_color TEXT DEFAULT '#4299e1',
        theme_mode TEXT DEFAULT 'light',
        operation_mode TEXT DEFAULT 'system',
        default_printer_width INTEGER DEFAULT 58,
        currency_symbol TEXT DEFAULT 'KES',
        date_format TEXT DEFAULT 'DD/MM/YYYY',
        time_format TEXT DEFAULT '24h',
        extra_settings TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Receipt Templates table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS receipt_templates (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL UNIQUE,
        header_text TEXT DEFAULT '',
        footer_text TEXT DEFAULT 'Thank you for your purchase!',
        logo TEXT,
        layout TEXT DEFAULT 'standard',
        show_logo INTEGER DEFAULT 1,
        show_shop_address INTEGER DEFAULT 1,
        show_shop_phone INTEGER DEFAULT 1,
        show_attendant_name INTEGER DEFAULT 1,
        show_customer_name INTEGER DEFAULT 1,
        show_tax_breakdown INTEGER DEFAULT 1,
        show_payment_method INTEGER DEFAULT 1,
        printer_width INTEGER DEFAULT 58,
        custom_fields TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Database tables created successfully");
    return db;
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
};

// Migration function
export const migrateDatabase = async () => {
  try {
    const db = await openDatabase();

    // Add onboarding columns to user_profiles if missing
    const userProfileColumns = await db.getAllAsync("PRAGMA table_info(user_profiles)");
    const profileColNames = userProfileColumns.map(col => col.name);
    const newProfileFields = ['has_changed_temp_password', 'is_first_login_complete', 'onboarding_completed_at'];
    for (const field of newProfileFields) {
      if (!profileColNames.includes(field)) {
        let columnDef = '';
        if (field === 'has_changed_temp_password') columnDef = 'has_changed_temp_password INTEGER DEFAULT 0';
        if (field === 'is_first_login_complete') columnDef = 'is_first_login_complete INTEGER DEFAULT 0';
        if (field === 'onboarding_completed_at') columnDef = 'onboarding_completed_at TEXT';
        await db.execAsync(`ALTER TABLE user_profiles ADD COLUMN ${columnDef}`);
        console.log(`✅ Added ${field} to user_profiles`);
      }
    }

    // Check if taxes table exists
    const taxesExists = await db.getAllAsync("PRAGMA table_info(taxes)");
    if (!taxesExists || taxesExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE taxes (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          name TEXT NOT NULL,
          rate REAL DEFAULT 0.0,
          tax_type TEXT NOT NULL DEFAULT 'standard',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0
        )
      `);
      console.log("✅ Created taxes table");
    }

    // Check if products table has new columns
    const productsSchema = await db.getAllAsync("PRAGMA table_info(products)");
    const productColumns = productsSchema.map(col => col.name);
    
    const requiredProductColumns = [
      'has_variants', 'variant_type', 'base_barcode', 'base_sku',
      'base_cost_price', 'base_selling_price', 'base_wholesale_price',
      'tax_id', 'tax_inclusive', 'is_trackable', 'created_by'
    ];

    for (const column of requiredProductColumns) {
      if (!productColumns.includes(column)) {
        let columnDefinition = '';
        switch(column) {
          case 'has_variants':
            columnDefinition = 'has_variants INTEGER DEFAULT 0';
            break;
          case 'variant_type':
            columnDefinition = 'variant_type TEXT DEFAULT "none"';
            break;
          case 'base_barcode':
            columnDefinition = 'base_barcode TEXT UNIQUE';
            break;
          case 'base_sku':
            columnDefinition = 'base_sku TEXT UNIQUE';
            break;
          case 'base_cost_price':
            columnDefinition = 'base_cost_price REAL';
            break;
          case 'base_selling_price':
            columnDefinition = 'base_selling_price REAL';
            break;
          case 'base_wholesale_price':
            columnDefinition = 'base_wholesale_price REAL';
            break;
          case 'tax_id':
            columnDefinition = 'tax_id TEXT';
            break;
          case 'tax_inclusive':
            columnDefinition = 'tax_inclusive INTEGER DEFAULT 1';
            break;
          case 'is_trackable':
            columnDefinition = 'is_trackable INTEGER DEFAULT 1';
            break;
          case 'created_by':
            columnDefinition = 'created_by TEXT';
            break;
        }
        
        if (columnDefinition) {
          await db.execAsync(`ALTER TABLE products ADD COLUMN ${columnDefinition}`);
          console.log(`✅ Added ${column} column to products table`);
        }
      }
    }

    // Check if product_attributes table exists
    const attributesExists = await db.getAllAsync("PRAGMA table_info(product_attributes)");
    if (!attributesExists || attributesExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE product_attributes (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          product_id TEXT NOT NULL,
          name TEXT NOT NULL,
          display_order INTEGER DEFAULT 0,
          is_required INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(product_id, name)
        )
      `);
      console.log("✅ Created product_attributes table");
    }

    // Check if product_attribute_values table exists
    const attributeValuesExists = await db.getAllAsync("PRAGMA table_info(product_attribute_values)");
    if (!attributeValuesExists || attributeValuesExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE product_attribute_values (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          attribute_id TEXT NOT NULL,
          value TEXT NOT NULL,
          display_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0,
          FOREIGN KEY (attribute_id) REFERENCES product_attributes (id) ON DELETE CASCADE,
          UNIQUE(attribute_id, value)
        )
      `);
      console.log("✅ Created product_attribute_values table");
    }

    // Check if product_variants table exists
    const variantsExists = await db.getAllAsync("PRAGMA table_info(product_variants)");
    if (!variantsExists || variantsExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE product_variants (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          product_id TEXT NOT NULL,
          name TEXT,
          sku TEXT UNIQUE,
          barcode TEXT UNIQUE,
          cost_price REAL,
          selling_price REAL,
          wholesale_price REAL,
          weight REAL,
          dimensions TEXT,
          image TEXT,
          is_active INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(product_id, name)
        )
      `);
      console.log("✅ Created product_variants table");
    }

    // Check if product_variant_attributes table exists
    const variantAttributesExists = await db.getAllAsync("PRAGMA table_info(product_variant_attributes)");
    if (!variantAttributesExists || variantAttributesExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE product_variant_attributes (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          variant_id TEXT NOT NULL,
          attribute_id TEXT NOT NULL,
          value_id TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0,
          FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
          FOREIGN KEY (attribute_id) REFERENCES product_attributes (id) ON DELETE CASCADE,
          FOREIGN KEY (value_id) REFERENCES product_attribute_values (id) ON DELETE CASCADE,
          UNIQUE(variant_id, attribute_id)
        )
      `);
      console.log("✅ Created product_variant_attributes table");
    }

    // Check if product_images table exists
    const productImagesExists = await db.getAllAsync("PRAGMA table_info(product_images)");
    if (!productImagesExists || productImagesExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE product_images (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          product_id TEXT,
          variant_id TEXT,
          image TEXT NOT NULL,
          caption TEXT,
          display_order INTEGER DEFAULT 0,
          is_primary INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
          CHECK (
            (product_id IS NOT NULL AND variant_id IS NULL) OR
            (product_id IS NULL AND variant_id IS NOT NULL)
          )
        )
      `);
      console.log("✅ Created product_images table");
    }

    // Check if categories table has business_server_id column
    const categorySchema = await db.getAllAsync("PRAGMA table_info(categories)");
    const hasBusinessServerId = categorySchema.some(col => col.name === 'business_server_id');
    
    if (!hasBusinessServerId) {
      await db.execAsync("ALTER TABLE categories ADD COLUMN business_server_id TEXT");
      console.log("✅ Added business_server_id column to categories table");
    }

    // Check if products table has business_server_id column
    const hasProductsBusinessServerId = productColumns.includes('business_server_id');
    if (!hasProductsBusinessServerId) {
      await db.execAsync("ALTER TABLE products ADD COLUMN business_server_id TEXT");
      console.log("✅ Added business_server_id column to products table");
    }

    // --- Add new columns to inventory table ---
    const inventoryColumns = await db.getAllAsync("PRAGMA table_info(inventory)");
    const inventoryColNames = inventoryColumns.map(col => col.name);

    if (!inventoryColNames.includes('last_movement')) {
      await db.execAsync("ALTER TABLE inventory ADD COLUMN last_movement TEXT");
      console.log("✅ Added last_movement column to inventory table");
    }
    if (!inventoryColNames.includes('is_locked')) {
      await db.execAsync("ALTER TABLE inventory ADD COLUMN is_locked INTEGER DEFAULT 0");
      console.log("✅ Added is_locked column to inventory table");
    }

    // --- Create stock_movements table if not exists ---
    const stockMovementsExists = await db.getAllAsync("PRAGMA table_info(stock_movements)");
    if (!stockMovementsExists || stockMovementsExists.length === 0) {
      await db.execAsync(`
        CREATE TABLE stock_movements (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          inventory_id TEXT NOT NULL,
          shop_id TEXT NOT NULL,
          product_id TEXT,
          variant_id TEXT,
          movement_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          reference TEXT,
          reason TEXT,
          performed_by TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          is_dirty INTEGER DEFAULT 0,
          FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
          FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
          FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
        )
      `);
      console.log("✅ Created stock_movements table");

      // Create indexes
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON stock_movements(inventory_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON stock_movements(shop_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
      `);
    }

    console.log("✅ Database migration completed");
    return true;
  } catch (error) {
    console.error("❌ Database migration error:", error);
    return false;
  }
};

// Update initDatabase
export const initDatabase = async () => {
  try {
    await initializeDatabase();
    await migrateDatabase();
    await fixRoleUUIDs();
    console.log("📊 Database initialized, migrated, and UUIDs fixed successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
};

// Base Service with common methods
const BaseService = {
  // Generic save method
  saveRecord: async (tableName, data, idField = "id", uniqueFields = []) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(data);
      const recordId = normalizedData[idField] || nanoid();
      const now = new Date().toISOString();

      // Build WHERE clause for unique fields
      let whereClause = "";
      const whereParams = [];

      if (uniqueFields.length > 0) {
        const conditions = uniqueFields.map((field) => {
          whereParams.push(normalizedData[field]);
          return `${field} = ?`;
        });
        whereClause = `WHERE ${conditions.join(" AND ")}`;
      }

      // Check if record exists
      let existingRecord = null;
      if (uniqueFields.length > 0) {
        existingRecord = await db.getFirstAsync(
          `SELECT ${idField} FROM ${tableName} ${whereClause}`,
          whereParams
        );
      }

      if (existingRecord) {
        // Update existing record
        const fields = Object.keys(normalizedData).filter(
          (field) => field !== idField
        );
        const values = fields.map((field) => normalizedData[field]);

        const setClause = fields.map((field) => `${field} = ?`).join(", ");

        await db.runAsync(
          `UPDATE ${tableName} SET ${setClause}, updated_at = ?, is_dirty = 1 WHERE ${idField} = ?`,
          [...values, now, existingRecord[idField]]
        );

        return { id: existingRecord[idField], action: "updated" };
      } else {
        // Insert new record
        const fields = Object.keys(normalizedData);
        const placeholders = fields.map(() => "?").join(", ");

        await db.runAsync(
          `INSERT INTO ${tableName} (${fields.join(
            ", "
          )}) VALUES (${placeholders})`,
          fields.map((field) => normalizedData[field])
        );

        return { id: recordId, action: "created" };
      }
    } catch (error) {
      console.error(`Error saving record to ${tableName}:`, error);
      throw error;
    }
  },

  // Generic get by ID
  getById: async (tableName, id, idField = "id") => {
    try {
      const db = await openDatabase();
      const record = await db.getFirstAsync(
        `SELECT * FROM ${tableName} WHERE ${idField} = ?`,
        [ensureStringId(id)]
      );
      return record;
    } catch (error) {
      console.error(`Error getting record from ${tableName}:`, error);
      return null;
    }
  },

  // Generic get all with filters
  getAll: async (
    tableName,
    where = "",
    params = [],
    orderBy = "created_at DESC"
  ) => {
    try {
      const db = await openDatabase();
      const whereClause = where ? `WHERE ${where}` : "";
      const orderClause = orderBy ? `ORDER BY ${orderBy}` : "";

      return await db.getAllAsync(
        `SELECT * FROM ${tableName} ${whereClause} ${orderClause}`,
        params
      );
    } catch (error) {
      console.error(`Error getting records from ${tableName}:`, error);
      return [];
    }
  },

  // Generic update
  update: async (tableName, id, updates, idField = "id") => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const idStr = ensureStringId(id);

      const fields = Object.keys(updates);
      const values = fields.map((field) => updates[field]);

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE ${tableName} SET ${setClause}, updated_at = ?, is_dirty = 1 WHERE ${idField} = ?`,
        [...values, now, idStr]
      );

      return true;
    } catch (error) {
      console.error(`Error updating record in ${tableName}:`, error);
      return false;
    }
  },

  // Generic delete (soft delete)
  softDelete: async (tableName, id, idField = "id") => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();

      await db.runAsync(
        `UPDATE ${tableName} SET is_active = 0, updated_at = ?, is_dirty = 1 WHERE ${idField} = ?`,
        [now, ensureStringId(id)]
      );

      return true;
    } catch (error) {
      console.error(`Error deleting record from ${tableName}:`, error);
      return false;
    }
  },

  // Get pending sync records
  getPendingSync: async (tableName) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT * FROM ${tableName} WHERE is_dirty = 1 OR sync_status = "pending"`
      );
    } catch (error) {
      console.error(`Error getting pending sync from ${tableName}:`, error);
      return [];
    }
  },

  // Mark as synced
  markAsSynced: async (tableName, localId, serverId, idField = "id") => {
    try {
      const db = await openDatabase();
      await db.runAsync(
        `UPDATE ${tableName} SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = "synced" WHERE ${idField} = ?`,
        [
          ensureStringId(serverId),
          new Date().toISOString(),
          ensureStringId(localId),
        ]
      );
      return true;
    } catch (error) {
      console.error(`Error marking record as synced in ${tableName}:`, error);
      return false;
    }
  },
};

// ======================
// USER SERVICES
// ======================

// User Service
export const UserService = {
  // Save or update user - UPDATED with profile_picture handling and onboarding flags
  saveUser: async (userData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(userData);
      const userId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      // Check if user exists by server_id or email/username
      let existingUser = null;

      if (normalizedData.server_id) {
        existingUser = await db.getFirstAsync(
          "SELECT id FROM users WHERE server_id = ?",
          [normalizedData.server_id]
        );
      }

      if (!existingUser && normalizedData.email) {
        existingUser = await db.getFirstAsync(
          "SELECT id FROM users WHERE email = ?",
          [normalizedData.email]
        );
      }

      if (!existingUser && normalizedData.username) {
        existingUser = await db.getFirstAsync(
          "SELECT id FROM users WHERE username = ?",
          [normalizedData.username]
        );
      }

      if (existingUser) {
        // Update existing user with ALL fields from server
        await db.runAsync(
          `UPDATE users SET
            server_id = ?,
            username = ?,
            email = ?,
            first_name = ?,
            last_name = ?,
            user_type = ?,
            phone_number = ?,
            is_verified = ?,
            is_active = ?,
            last_login = ?,
            date_joined = ?,
            profile_picture = ?,
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.server_id || normalizedData.id || existingUser.server_id,
            normalizedData.username || existingUser.username,
            normalizedData.email || existingUser.email || "",
            normalizedData.first_name || existingUser.first_name || "",
            normalizedData.last_name || existingUser.last_name || "",
            normalizedData.user_type || existingUser.user_type || "employee",
            normalizedData.phone_number || existingUser.phone_number || "",
            normalizedData.is_verified ? 1 : existingUser.is_verified || 0,
            normalizedData.is_active !== false ? 1 : existingUser.is_active || 1,
            normalizedData.last_login || existingUser.last_login || now,
            normalizedData.date_joined || existingUser.date_joined || now,
            normalizedData.profile_picture || existingUser.profile_picture || null,
            now,
            now,
            existingUser.id,
          ]
        );

        // Update or create profile with ALL profile fields (including onboarding flags)
        await UserProfileService.saveProfile(existingUser.id, {
          date_of_birth: normalizedData.date_of_birth,
          preferences: normalizedData.preferences,
          fcm_token: normalizedData.fcm_token,
          pin_hash: normalizedData.pin_hash,
          profile_picture: normalizedData.profile_picture,
          server_profile_picture: normalizedData.profile_picture,
          local_profile_picture: normalizedData.local_profile_picture,
          has_changed_temp_password: normalizedData.has_changed_temp_password,
          is_first_login_complete: normalizedData.is_first_login_complete,
          onboarding_completed_at: normalizedData.onboarding_completed_at,
        });

        return {
          id: existingUser.id,
          action: "updated",
          user: await UserService.getUserById(existingUser.id),
        };
      } else {
        // Insert new user with ALL fields
        await db.runAsync(
          `INSERT INTO users (
            id, server_id, username, email, first_name, last_name,
            user_type, phone_number, is_verified, is_active, last_login,
            date_joined, profile_picture, created_at, updated_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            normalizedData.server_id || normalizedData.id,
            normalizedData.username,
            normalizedData.email || "",
            normalizedData.first_name || "",
            normalizedData.last_name || "",
            normalizedData.user_type || "employee",
            normalizedData.phone_number || "",
            normalizedData.is_verified ? 1 : 0,
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.last_login || now,
            normalizedData.date_joined || normalizedData.created_at || now,
            normalizedData.profile_picture || null,
            now,
            now,
            now,
            "synced",
            0,
          ]
        );

        // Create profile if there's profile data (including onboarding flags)
        await UserProfileService.saveProfile(userId, {
          date_of_birth: normalizedData.date_of_birth,
          preferences: normalizedData.preferences,
          fcm_token: normalizedData.fcm_token,
          pin_hash: normalizedData.pin_hash,
          profile_picture: normalizedData.profile_picture,
          server_profile_picture: normalizedData.profile_picture,
          local_profile_picture: normalizedData.local_profile_picture,
          has_changed_temp_password: normalizedData.has_changed_temp_password,
          is_first_login_complete: normalizedData.is_first_login_complete,
          onboarding_completed_at: normalizedData.onboarding_completed_at,
        });

        return {
          id: userId,
          action: "created",
          user: await UserService.getUserById(userId),
        };
      }
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const db = await openDatabase();
      const userIdStr = ensureStringId(userId);
      const user = await db.getFirstAsync(
        `SELECT u.*, up.date_of_birth, up.profile_picture as profile_picture_extended, up.server_profile_picture, up.local_profile_picture, up.preferences,
                up.has_changed_temp_password, up.is_first_login_complete, up.onboarding_completed_at
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ?`,
        [userIdStr]
      );
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  },

  // Get current active user
  getCurrentUser: async () => {
    try {
      const db = await openDatabase();

      // First, try to get user with active session from AsyncStorage
      const lastUserId = await AsyncStorage.getItem("@vendex_last_user_id");

      if (lastUserId) {
        const user = await db.getFirstAsync(
          `SELECT u.*, up.date_of_birth, up.profile_picture as profile_picture_extended, up.server_profile_picture, up.local_profile_picture, up.preferences,
                  up.has_changed_temp_password, up.is_first_login_complete, up.onboarding_completed_at
           FROM users u
           LEFT JOIN user_profiles up ON u.id = up.user_id
           WHERE u.id = ?`,
          [lastUserId]
        );
        if (user && user.is_active) {
          return user;
        }
      }

      // Fallback: get the most recent active user
      const user = await db.getFirstAsync(
        `SELECT u.*, up.date_of_birth, up.profile_picture as profile_picture_extended, up.server_profile_picture, up.local_profile_picture, up.preferences,
                up.has_changed_temp_password, up.is_first_login_complete, up.onboarding_completed_at
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.is_active = 1
         ORDER BY u.last_login DESC
         LIMIT 1`
      );

      if (user) {
        await AsyncStorage.setItem("@vendex_last_user_id", String(user.id));
      }

      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // Update user locally
  updateUserLocal: async (userId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const userIdStr = ensureStringId(userId);

      // Separate user fields from profile fields
      const userFields = [
        "username",
        "email",
        "first_name",
        "last_name",
        "user_type",
        "phone_number",
        "is_verified",
        "is_active",
        "last_login",
        "profile_picture"
      ];
      const profileFields = [
        "date_of_birth",
        "profile_picture",
        "server_profile_picture",
        "local_profile_picture",
        "preferences",
        "fcm_token",
        "pin_hash",
        "has_changed_temp_password",
        "is_first_login_complete",
        "onboarding_completed_at"
      ];

      const userUpdates = {};
      const profileUpdates = {};

      Object.keys(updates).forEach((field) => {
        if (userFields.includes(field)) {
          userUpdates[field] = updates[field];
        } else if (profileFields.includes(field)) {
          profileUpdates[field] = updates[field];
        }
      });

      // Update users table if there are user updates
      if (Object.keys(userUpdates).length > 0) {
        const fields = Object.keys(userUpdates);
        const values = fields.map((field) => userUpdates[field]);

        const setClause = fields.map((field) => `${field} = ?`).join(", ");

        await db.runAsync(
          `UPDATE users SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
          [...values, now, userIdStr]
        );
      }

      // Update profile if there are profile updates
      if (Object.keys(profileUpdates).length > 0) {
        await UserProfileService.updateProfile(userIdStr, profileUpdates);
      }

      return await UserService.getUserById(userIdStr);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  // Mark user as current
  setCurrentUser: async (userId) => {
    try {
      const userIdStr = String(userId);
      await AsyncStorage.setItem("@vendex_last_user_id", userIdStr);

      // Update last login time
      const db = await openDatabase();
      await db.runAsync(
        "UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?",
        [new Date().toISOString(), new Date().toISOString(), userIdStr]
      );

      console.log("✅ Current user set:", userIdStr);
      return true;
    } catch (error) {
      console.error("Error setting current user:", error);
      return false;
    }
  },

  // Get users pending sync
  getPendingSyncUsers: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM users WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync users:", error);
      return [];
    }
  },

  // Mark user as synced
  markUserAsSynced: async (userId, serverId) => {
    try {
      const db = await openDatabase();
      const userIdStr = ensureStringId(userId);
      const serverIdStr = ensureStringId(serverId);

      await db.runAsync(
        'UPDATE users SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = "synced" WHERE id = ?',
        [serverIdStr, new Date().toISOString(), userIdStr]
      );
      return true;
    } catch (error) {
      console.error("Error marking user as synced:", error);
      return false;
    }
  },

  // Clear current user from AsyncStorage
  clearCurrentUser: async () => {
    try {
      await AsyncStorage.removeItem("@vendex_last_user_id");
      await AsyncStorage.removeItem("@vendex_current_shop_id");
      await AsyncStorage.removeItem("@vendex_current_business_id");
      console.log("🗑️ Cleared current user from storage");
      return true;
    } catch (error) {
      console.error("Error clearing current user:", error);
      return false;
    }
  },

  // Get all users (for admin/owner views)
  getAllUsers: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM users WHERE is_active = 1 ORDER BY username"
      );
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  },
};

// User Profile Service
export const UserProfileService = {
  // Save or update profile
  saveProfile: async (userId, profileData) => {
    try {
      const db = await openDatabase();
      const profileId = nanoid();
      const now = new Date().toISOString();
      const userIdStr = ensureStringId(userId);
      const normalizedData = normalizeIds(profileData);

      const existingProfile = await db.getFirstAsync(
        "SELECT id FROM user_profiles WHERE user_id = ?",
        [userIdStr]
      );

      if (existingProfile) {
        // Update existing profile with ALL fields
        await db.runAsync(
          `UPDATE user_profiles SET
            server_id = COALESCE(?, server_id),
            date_of_birth = COALESCE(?, date_of_birth),
            fcm_token = COALESCE(?, fcm_token),
            pin_hash = COALESCE(?, pin_hash),
            profile_picture = COALESCE(?, profile_picture),
            server_profile_picture = COALESCE(?, server_profile_picture),
            local_profile_picture = COALESCE(?, local_profile_picture),
            preferences = COALESCE(?, preferences),
            has_changed_temp_password = COALESCE(?, has_changed_temp_password),
            is_first_login_complete = COALESCE(?, is_first_login_complete),
            onboarding_completed_at = COALESCE(?, onboarding_completed_at),
            updated_at = ?,
            synced_at = ?,
            is_dirty = 0
          WHERE user_id = ?`,
          [
            normalizedData.server_id || normalizedData.id,
            normalizedData.date_of_birth,
            normalizedData.fcm_token,
            normalizedData.pin_hash,
            normalizedData.profile_picture,
            normalizedData.profile_picture,
            normalizedData.local_profile_picture,
            normalizedData.preferences ? JSON.stringify(normalizedData.preferences) : "{}",
            normalizedData.has_changed_temp_password !== undefined ? (normalizedData.has_changed_temp_password ? 1 : 0) : null,
            normalizedData.is_first_login_complete !== undefined ? (normalizedData.is_first_login_complete ? 1 : 0) : null,
            normalizedData.onboarding_completed_at || null,
            now,
            now,
            userIdStr,
          ]
        );
      } else {
        // Insert new profile
        await db.runAsync(
          `INSERT INTO user_profiles (
            id, server_id, user_id, date_of_birth, fcm_token, pin_hash,
            profile_picture, server_profile_picture, local_profile_picture,
            preferences, has_changed_temp_password, is_first_login_complete,
            onboarding_completed_at, created_at, updated_at, synced_at, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            profileId,
            normalizedData.server_id || normalizedData.id,
            userIdStr,
            normalizedData.date_of_birth || null,
            normalizedData.fcm_token || null,
            normalizedData.pin_hash || null,
            normalizedData.profile_picture || null,
            normalizedData.profile_picture || null,
            normalizedData.local_profile_picture || null,
            normalizedData.preferences ? JSON.stringify(normalizedData.preferences) : "{}",
            normalizedData.has_changed_temp_password ? 1 : 0,
            normalizedData.is_first_login_complete ? 1 : 0,
            normalizedData.onboarding_completed_at || null,
            now,
            now,
            now,
            0,
          ]
        );
      }

      return true;
    } catch (error) {
      console.error("Error saving profile:", error);
      throw error;
    }
  },

  // Update profile
  updateProfile: async (userId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const userIdStr = ensureStringId(userId);

      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === "preferences" && typeof updates[field] === "object") {
          return JSON.stringify(updates[field]);
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE user_profiles SET ${setClause}, updated_at = ?, is_dirty = 1 WHERE user_id = ?`,
        [...values, now, userIdStr]
      );

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  },

  // Get profile by user ID
  getProfile: async (userId) => {
    try {
      const db = await openDatabase();
      const userIdStr = ensureStringId(userId);
      return await db.getFirstAsync(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [userIdStr]
      );
    } catch (error) {
      console.error("Error getting profile:", error);
      return null;
    }
  },

  // Get profiles pending sync
  getPendingSyncProfiles: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM user_profiles WHERE is_dirty = 1"
      );
    } catch (error) {
      console.error("Error getting pending sync profiles:", error);
      return [];
    }
  },

  // Mark profile as synced
  markProfileAsSynced: async (profileId, serverId) => {
    try {
      const db = await openDatabase();
      const profileIdStr = ensureStringId(profileId);
      const serverIdStr = ensureStringId(serverId);

      await db.runAsync(
        "UPDATE user_profiles SET server_id = ?, synced_at = ?, is_dirty = 0 WHERE id = ?",
        [serverIdStr, new Date().toISOString(), profileIdStr]
      );
      return true;
    } catch (error) {
      console.error("Error marking profile as synced:", error);
      return false;
    }
  },
};

// Business Service - UPDATED with fixed employee count query
export const BusinessService = {
  // Create new business locally
  createBusiness: async (businessData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(businessData);
      const businessId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      // Determine sync status based on server_id
      const hasServerId = normalizedData.server_id;
      const syncStatus = hasServerId ? "synced" : "pending";
      const isDirty = hasServerId ? 0 : 1;

      // Check if business already exists
      const existingBusiness = await db.getFirstAsync(
        "SELECT id FROM businesses WHERE owner_id = ? AND name = ?",
        [ensureStringId(normalizedData.owner_id), normalizedData.name]
      );

      if (existingBusiness) {
        throw new Error("Business with this name already exists");
      }

      await db.runAsync(
        `INSERT INTO businesses (
        id, server_id, owner_id, name, registration_number, phone_number, email,
        address, industry, business_type, tax_id, website, description,
        established_date, color, icon, created_at, updated_at, 
        sync_status, is_dirty, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessId,
          normalizedData.server_id || null,
          ensureStringId(normalizedData.owner_id),
          normalizedData.name || "",
          normalizedData.registration_number || "",
          normalizedData.phone_number || "",
          normalizedData.email || "",
          normalizedData.address || "",
          normalizedData.industry || "",
          normalizedData.business_type || "",
          normalizedData.tax_id || "",
          normalizedData.website || "",
          normalizedData.description || "",
          normalizedData.established_date || now,
          normalizedData.color || "#FF6B00",
          normalizedData.icon || "business",
          now,
          now,
          syncStatus,
          isDirty,
          1,
        ]
      );

      // Set as current business for this owner
      await BusinessService.setCurrentBusiness(businessId);

      console.log(
        `✅ Business ${
          syncStatus === "synced" ? "saved (synced)" : "saved (pending sync)"
        }: ${businessId}`
      );
      return {
        success: true,
        id: businessId,
        message: "Business saved successfully",
      };
    } catch (error) {
      console.error("❌ Error saving business:", error);
      return { success: false, error: error.message };
    }
  },

  // Get business by ID
  getBusinessById: async (businessId) => {
    try {
      const db = await openDatabase();
      const business = await db.getFirstAsync(
        "SELECT b.*, u.username as owner_username FROM businesses b LEFT JOIN users u ON b.owner_id = u.id WHERE b.id = ?",
        [ensureStringId(businessId)]
      );
      return business;
    } catch (error) {
      console.error("Error getting business by ID:", error);
      return null;
    }
  },

  // Get business by server ID
  getBusinessByServerId: async (serverId) => {
    try {
      const db = await openDatabase();
      const business = await db.getFirstAsync(
        "SELECT b.*, u.username as owner_username FROM businesses b LEFT JOIN users u ON b.owner_id = u.id WHERE b.server_id = ?",
        [ensureStringId(serverId)]
      );
      return business;
    } catch (error) {
      console.error("Error getting business by server ID:", error);
      return null;
    }
  },

  // Get all businesses for owner - FIXED EMPLOYEE COUNT QUERY
  getBusinessesByOwner: async (ownerId) => {
    try {
      const db = await openDatabase();
      const businesses = await db.getAllAsync(
        "SELECT b.*, u.username as owner_username FROM businesses b LEFT JOIN users u ON b.owner_id = u.id WHERE b.owner_id = ? AND b.is_active = 1 ORDER BY b.created_at DESC",
        [ensureStringId(ownerId)]
      );

      // Calculate shop and employee counts for each business
      for (const business of businesses) {
        // Get shops for business
        const shops = await ShopService.getShopsByBusiness(business.id);
        business.shop_count = shops.length;

        // Employee count - FIXED: Use simple count without problematic joins
        const employeeCount = await db.getFirstAsync(
          "SELECT COUNT(*) as count FROM employees WHERE business_id = ? AND is_active = 1",
          [business.id]
        );
        business.employee_count = employeeCount?.count || 0;

        console.log(
          `📊 Business ${business.name}: ${shops.length} shops, ${business.employee_count} employees`
        );
      }

      return businesses;
    } catch (error) {
      console.error("Error getting businesses by owner:", error);
      return [];
    }
  },

  // Get current business for user
  getCurrentBusiness: async (userId) => {
    try {
      const db = await openDatabase();
      // First try to get user's current business
      let business = await db.getFirstAsync(
        "SELECT b.* FROM businesses b WHERE b.owner_id = ? AND b.is_current = 1 AND b.is_active = 1 LIMIT 1",
        [ensureStringId(userId)]
      );

      // If user doesn't own a business, check if they're an employee in one
      if (!business) {
        business = await db.getFirstAsync(
          `SELECT DISTINCT b.* FROM businesses b 
           INNER JOIN employees e ON b.id = e.business_id 
           WHERE e.user_id = ? AND b.is_active = 1 AND e.is_active = 1 
           LIMIT 1`,
          [ensureStringId(userId)]
        );
      }

      if (business) {
        await AsyncStorage.setItem(
          "@vendex_current_business_id",
          String(business.id)
        );
      }

      return business;
    } catch (error) {
      console.error("Error getting current business:", error);
      return null;
    }
  },

  // Set current business
  setCurrentBusiness: async (businessId) => {
    try {
      const db = await openDatabase();
      const businessIdStr = ensureStringId(businessId);

      // Get business to find owner
      const business = await BusinessService.getBusinessById(businessIdStr);
      if (!business) {
        throw new Error("Business not found");
      }

      // Reset all businesses for this owner to not current
      await db.runAsync(
        "UPDATE businesses SET is_current = 0 WHERE owner_id = ?",
        [ensureStringId(business.owner_id)]
      );

      // Set selected business as current
      await db.runAsync(
        "UPDATE businesses SET is_current = 1, updated_at = ? WHERE id = ?",
        [new Date().toISOString(), businessIdStr]
      );

      // Store in AsyncStorage for quick access
      await AsyncStorage.setItem("@vendex_current_business_id", businessIdStr);

      return true;
    } catch (error) {
      console.error("Error setting current business:", error);
      return false;
    }
  },

  // Update business locally
  updateBusiness: async (businessId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const businessIdStr = ensureStringId(businessId);

      // Get existing business
      const existingBusiness = await BusinessService.getBusinessById(
        businessIdStr
      );
      if (!existingBusiness) {
        throw new Error("Business not found");
      }

      // Build update query
      const fields = Object.keys(updates);
      const values = fields.map((field) => updates[field]);
      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE businesses SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [...values, now, businessIdStr]
      );

      return {
        success: true,
        business: await BusinessService.getBusinessById(businessIdStr),
      };
    } catch (error) {
      console.error("Error updating business:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete business locally (soft delete)
  deleteBusiness: async (businessId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const businessIdStr = ensureStringId(businessId);

      // Soft delete
      await db.runAsync(
        'UPDATE businesses SET is_active = 0, updated_at = ?, sync_status = "pending", is_dirty = 1 WHERE id = ?',
        [now, businessIdStr]
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting business:", error);
      return { success: false, error: error.message };
    }
  },

  // Get pending sync businesses
  getPendingSyncBusinesses: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM businesses WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync businesses:", error);
      return [];
    }
  },

  // Mark business as synced
  markAsSynced: async (localId, serverId) => {
    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE businesses SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = "synced" WHERE id = ?',
        [
          ensureStringId(serverId),
          new Date().toISOString(),
          ensureStringId(localId),
        ]
      );
      return true;
    } catch (error) {
      console.error("Error marking business as synced:", error);
      return false;
    }
  },

  // Get businesses where user has access (owner or employee)
  getUserBusinesses: async (userId) => {
    try {
      const db = await openDatabase();

      // Get businesses where user is owner
      const ownedBusinesses = await db.getAllAsync(
        "SELECT b.* FROM businesses b WHERE b.owner_id = ? AND b.is_active = 1",
        [ensureStringId(userId)]
      );

      // Get businesses where user is employee
      const employeeBusinesses = await db.getAllAsync(
        `SELECT DISTINCT b.* FROM businesses b 
         INNER JOIN employees e ON b.id = e.business_id 
         WHERE e.user_id = ? AND e.is_active = 1 AND b.is_active = 1`,
        [ensureStringId(userId)]
      );

      // Combine and remove duplicates
      const allBusinesses = [...ownedBusinesses, ...employeeBusinesses];
      const uniqueBusinesses = allBusinesses.filter(
        (business, index, self) =>
          index === self.findIndex((b) => b.id === business.id)
      );

      return uniqueBusinesses;
    } catch (error) {
      console.error("Error getting user businesses:", error);
      return [];
    }
  },
};

// Shop Service - UPDATED WITH MISSING METHODS
export const ShopService = {
  // Create shop for business
  createShop: async (shopData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(shopData);
      const shopId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      // Get business to get server_id if available
      const business = await BusinessService.getBusinessById(
        normalizedData.business_id
      );
      const businessServerId = business?.server_id || null;

      console.log("📝 Creating shop with business:", {
        businessId: normalizedData.business_id,
        businessServerId: businessServerId,
        businessName: business?.name,
      });

      // Check if shop already exists in this business
      const existingShop = await db.getFirstAsync(
        "SELECT id FROM shops WHERE business_id = ? AND name = ?",
        [ensureStringId(normalizedData.business_id), normalizedData.name]
      );

      if (existingShop) {
        throw new Error("Shop with this name already exists in this business");
      }

      // Insert new shop with both business_id and business_server_id
      await db.runAsync(
        `INSERT INTO shops (
          id, server_id, business_id, business_server_id, name, shop_type, location, phone_number,
          email, manager_id, tax_rate, currency, monthly_sales, employee_count,
          is_active, is_current, created_at, updated_at, synced_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shopId,
          normalizedData.server_id || null,
          ensureStringId(normalizedData.business_id), // Local business ID
          businessServerId, // Server business UUID
          normalizedData.name || "",
          normalizedData.shop_type || "retail",
          normalizedData.location || "",
          normalizedData.phone_number || "",
          normalizedData.email || "",
          normalizedData.manager_id
            ? ensureStringId(normalizedData.manager_id)
            : null,
          normalizedData.tax_rate || 0.0,
          normalizedData.currency || "KES",
          normalizedData.monthly_sales || 0.0,
          normalizedData.employee_count || 0,
          1, // is_active
          0, // is_current (default to 0)
          now, // created_at
          now, // updated_at
          normalizedData.server_id ? now : null, // synced_at
          normalizedData.server_id ? "synced" : "pending", // sync_status
          normalizedData.server_id ? 0 : 1, // is_dirty
        ]
      );

      console.log(
        `✅ Shop created successfully: ${normalizedData.name} for business ${
          business?.name || normalizedData.business_id
        }`
      );
      return { success: true, id: shopId };
    } catch (error) {
      console.error("❌ Error creating shop:", error);
      return { success: false, error: error.message };
    }
  },

  // Update shop
  updateShop: async (shopId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const shopIdStr = ensureStringId(shopId);

      // Build update query
      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === "tax_rate") {
          return parseFloat(updates[field]) || 0.0;
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE shops SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [...values, now, shopIdStr]
      );

      // Get the updated shop
      const updatedShop = await ShopService.getShopById(shopIdStr);

      return { success: true, shop: updatedShop };
    } catch (error) {
      console.error("Error updating shop:", error);
      return { success: false, error: error.message };
    }
  },

  updateShopWithoutPending: async (shopId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const shopIdStr = ensureStringId(shopId);

      // Build update query WITHOUT marking as pending
      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === "tax_rate") {
          return parseFloat(updates[field]) || 0.0;
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE shops SET ${setClause}, updated_at = ?, sync_status = 'synced', is_dirty = 0 WHERE id = ?`,
        [...values, now, shopIdStr]
      );

      // Get the updated shop
      const updatedShop = await ShopService.getShopById(shopIdStr);

      return { success: true, shop: updatedShop };
    } catch (error) {
      console.error("Error updating shop without pending:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete shop (soft delete)
  deleteShop: async (shopId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const shopIdStr = ensureStringId(shopId);

      // Soft delete
      await db.runAsync(
        'UPDATE shops SET is_active = 0, updated_at = ?, sync_status = "pending", is_dirty = 1 WHERE id = ?',
        [now, shopIdStr]
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting shop:", error);
      return { success: false, error: error.message };
    }
  },

  // Create or update shop (for syncing) - UPDATED TO HANDLE BUSINESS SERVER ID
  createOrUpdateShop: async (shopData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(shopData);
      const now = new Date().toISOString();

      // Check if shop exists by server_id or id
      let existingShop = null;

      if (normalizedData.server_id) {
        existingShop = await db.getFirstAsync(
          "SELECT id FROM shops WHERE server_id = ?",
          [normalizedData.server_id]
        );
      }

      if (!existingShop && normalizedData.id) {
        existingShop = await db.getFirstAsync(
          "SELECT id FROM shops WHERE id = ?",
          [normalizedData.id]
        );
      }

      // Find the local business for this shop's business (using server ID)
      let businessServerId = normalizedData.business;
      let localBusinessId = null;

      if (businessServerId) {
        const business = await BusinessService.getBusinessByServerId(
          businessServerId
        );
        if (business) {
          localBusinessId = business.id;
        }
      }

      console.log("🔄 Syncing shop:", {
        shopName: normalizedData.name,
        businessServerId: businessServerId,
        localBusinessId: localBusinessId,
        existingShop: existingShop ? existingShop.id : "none",
      });

      if (existingShop) {
        // Update existing shop
        const fields = Object.keys(normalizedData);
        const values = fields.map((field) => normalizedData[field]);
        const setClause = fields.map((field) => `${field} = ?`).join(", ");

        await db.runAsync(
          `UPDATE shops SET ${setClause}, updated_at = ?, sync_status = 'synced', is_dirty = 0 WHERE id = ?`,
          [...values, now, existingShop.id]
        );

        return { success: true, id: existingShop.id, action: "updated" };
      } else {
        // Create new shop
        const shopId = nanoid();

        // If we have a server business ID but no local business found, log warning
        if (businessServerId && !localBusinessId) {
          console.warn(
            `⚠️ No local business found for server ID: ${businessServerId}, creating shop without business link`
          );
        }

        await db.runAsync(
          `INSERT INTO shops (
            id, server_id, business_id, business_server_id, name, shop_type, location, phone_number,
            email, manager_id, tax_rate, currency, monthly_sales, employee_count,
            is_active, is_current, created_at, updated_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            shopId,
            normalizedData.server_id || normalizedData.id || null,
            localBusinessId || normalizedData.business_id || null,
            businessServerId || normalizedData.business || null,
            normalizedData.name || "",
            normalizedData.shop_type || "retail",
            normalizedData.location || "",
            normalizedData.phone_number || "",
            normalizedData.email || "",
            normalizedData.manager_id
              ? ensureStringId(normalizedData.manager_id)
              : null,
            parseFloat(normalizedData.tax_rate) || 0.0,
            normalizedData.currency || "KES",
            normalizedData.monthly_sales || 0.0,
            normalizedData.employee_count || 0,
            normalizedData.is_active !== false ? 1 : 0,
            0, // is_current (default 0)
            normalizedData.created_at || now,
            now,
            now, // synced_at
            "synced",
            0,
          ]
        );

        console.log(
          `✅ Created synced shop: ${normalizedData.name} for business ${
            businessServerId || "unknown"
          }`
        );
        return { success: true, id: shopId, action: "created" };
      }
    } catch (error) {
      console.error("Error creating/updating shop:", error);
      return { success: false, error: error.message };
    }
  },

  // Get shops by business - ENHANCED TO HANDLE BOTH LOCAL AND SERVER IDS
  getShopsByBusiness: async (businessId) => {
    try {
      const db = await openDatabase();

      // First, check if this is a local business ID or server ID
      let localBusinessId = null;
      let businessServerId = null;

      // Try to find business by local ID
      const businessByLocalId = await db.getFirstAsync(
        "SELECT id, server_id FROM businesses WHERE id = ?",
        [ensureStringId(businessId)]
      );

      if (businessByLocalId) {
        localBusinessId = businessByLocalId.id;
        businessServerId = businessByLocalId.server_id;
      } else {
        // Try to find business by server ID
        const businessByServerId = await db.getFirstAsync(
          "SELECT id, server_id FROM businesses WHERE server_id = ?",
          [ensureStringId(businessId)]
        );

        if (businessByServerId) {
          localBusinessId = businessByServerId.id;
          businessServerId = businessByServerId.server_id;
        }
      }

      if (!localBusinessId && !businessServerId) {
        console.log("❌ No business found for ID:", businessId);
        return [];
      }

      console.log("🔍 Getting shops for business:", {
        inputId: businessId,
        localBusinessId,
        businessServerId,
      });

      // Try multiple strategies to find shops
      let shopsData = [];

      // Strategy 1: Try to find by local business ID
      if (localBusinessId) {
        shopsData = await db.getAllAsync(
          `SELECT s.*, u.username as manager_username 
           FROM shops s 
           LEFT JOIN users u ON s.manager_id = u.id 
           WHERE (s.business_id = ? OR s.business_server_id = ?) AND s.is_active = 1 
           ORDER BY s.created_at DESC`,
          [ensureStringId(localBusinessId), ensureStringId(businessServerId)]
        );

        if (shopsData.length > 0) {
          console.log(
            `✅ Found ${shopsData.length} shops by local business ID: ${localBusinessId}`
          );
          return shopsData;
        }
      }

      // Strategy 2: Try by business server ID
      if (businessServerId) {
        shopsData = await db.getAllAsync(
          `SELECT s.*, u.username as manager_username 
           FROM shops s 
           LEFT JOIN users u ON s.manager_id = u.id 
           WHERE s.business_server_id = ? AND s.is_active = 1 
           ORDER BY s.created_at DESC`,
          [ensureStringId(businessServerId)]
        );

        if (shopsData.length > 0) {
          console.log(
            `✅ Found ${shopsData.length} shops by business server ID: ${businessServerId}`
          );
          return shopsData;
        }
      }

      // Strategy 3: Try direct query without manager_id join
      shopsData = await db.getAllAsync(
        `SELECT s.* 
         FROM shops s 
         WHERE (s.business_id = ? OR s.business_server_id = ?) AND s.is_active = 1 
         ORDER BY s.created_at DESC`,
        [
          ensureStringId(localBusinessId || ""),
          ensureStringId(businessServerId || ""),
        ]
      );

      console.log(
        `ℹ️ Found ${shopsData.length} shops for business ${businessId}`
      );
      return shopsData;
    } catch (error) {
      console.error("Error getting shops by business:", error);
      return [];
    }
  },

  // Get shops by business server ID
  getShopsByBusinessServerId: async (serverId) => {
    try {
      const db = await openDatabase();

      console.log("🔍 Getting shops by business server ID:", serverId);

      const shopsData = await db.getAllAsync(
        `SELECT s.*, u.username as manager_username 
         FROM shops s 
         LEFT JOIN users u ON s.manager_id = u.id 
         WHERE s.business_server_id = ? AND s.is_active = 1 
         ORDER BY s.created_at DESC`,
        [ensureStringId(serverId)]
      );

      console.log(
        `✅ Found ${shopsData.length} shops by business server ID: ${serverId}`
      );
      return shopsData;
    } catch (error) {
      console.error("Error getting shops by business server ID:", error);
      return [];
    }
  },

  // Diagnostic method to debug shop-business relationships
  debugShopBusinessRelations: async () => {
    try {
      const db = await openDatabase();

      // Get all shops with their business info
      const allShops = await db.getAllAsync(`
        SELECT 
          s.id as shop_id,
          s.name as shop_name,
          s.business_id as shop_business_id,
          s.business_server_id as shop_business_server_id,
          s.server_id as shop_server_id,
          b.id as business_local_id,
          b.server_id as business_server_id,
          b.name as business_name
        FROM shops s
        LEFT JOIN businesses b ON s.business_id = b.id OR s.business_server_id = b.server_id
        ORDER BY s.created_at DESC
      `);

      console.log("🔍 SHOP-BUSINESS RELATIONSHIPS DIAGNOSTIC:");
      console.log(`Total shops in database: ${allShops.length}`);

      allShops.forEach((shop, index) => {
        console.log(`\n--- Shop ${index + 1}: ${shop.shop_name} ---`);
        console.log(`   Shop ID: ${shop.shop_id}`);
        console.log(`   Shop business_id (local): ${shop.shop_business_id}`);
        console.log(
          `   Shop business_server_id (server): ${shop.shop_business_server_id}`
        );
        console.log(
          `   Business local ID: ${shop.business_local_id || "NOT FOUND"}`
        );
        console.log(
          `   Business server ID: ${shop.business_server_id || "NOT FOUND"}`
        );
        console.log(`   Business name: ${shop.business_name || "NOT FOUND"}`);

        // Check relationships
        const hasLocalLink = shop.shop_business_id === shop.business_local_id;
        const hasServerLink =
          shop.shop_business_server_id === shop.business_server_id;

        console.log(`   Local link: ${hasLocalLink ? "✅" : "❌"}`);
        console.log(`   Server link: ${hasServerLink ? "✅" : "❌"}`);
      });

      // Also show all businesses
      const allBusinesses = await db.getAllAsync(`
        SELECT id, server_id, name FROM businesses ORDER BY created_at DESC
      `);

      console.log("\n📊 ALL BUSINESSES:");
      allBusinesses.forEach((business) => {
        console.log(
          `   ${business.name}: local=${business.id}, server=${
            business.server_id || "none"
          }`
        );
      });

      return { shops: allShops, businesses: allBusinesses };
    } catch (error) {
      console.error("Debug error:", error);
      return { shops: [], businesses: [] };
    }
  },

  // Set current shop
  setCurrentShop: async (shopId) => {
    try {
      const db = await openDatabase();
      const shopIdStr = ensureStringId(shopId);

      // Get shop to find its business
      const shop = await db.getFirstAsync(
        "SELECT business_id FROM shops WHERE id = ?",
        [shopIdStr]
      );

      if (!shop) {
        throw new Error("Shop not found");
      }

      // Reset all shops in this business to not current
      await db.runAsync(
        "UPDATE shops SET is_current = 0 WHERE business_id = ?",
        [ensureStringId(shop.business_id)]
      );

      // Set selected shop as current
      await db.runAsync(
        "UPDATE shops SET is_current = 1, updated_at = ? WHERE id = ?",
        [new Date().toISOString(), shopIdStr]
      );

      // Store in AsyncStorage
      await AsyncStorage.setItem("@vendex_current_shop_id", shopIdStr);

      return true;
    } catch (error) {
      console.error("Error setting current shop:", error);
      return false;
    }
  },

  // Get current shop for user
  getCurrentShop: async (userId) => {
    try {
      const db = await openDatabase();

      // First check AsyncStorage
      const shopId = await AsyncStorage.getItem("@vendex_current_shop_id");

      if (shopId) {
        const shop = await db.getFirstAsync(
          "SELECT s.* FROM shops s WHERE s.id = ? AND s.is_active = 1",
          [shopId]
        );

        if (shop) {
          // Check if user has access to this shop's business
          const access = await EmployeeService.checkUserBusinessAccess(
            userId,
            shop.business_id
          );
          if (access) {
            return shop;
          }
        }
      }

      // Fallback to shop marked as current in DB
      const shop = await db.getFirstAsync(
        `SELECT s.* FROM shops s 
         INNER JOIN employees e ON s.business_id = e.business_id 
         WHERE s.is_current = 1 AND s.is_active = 1 
         AND e.user_id = ? AND e.is_active = 1 
         LIMIT 1`,
        [ensureStringId(userId)]
      );

      if (shop) {
        await AsyncStorage.setItem("@vendex_current_shop_id", String(shop.id));
        return shop;
      }

      return null;
    } catch (error) {
      console.error("Error getting current shop:", error);
      return null;
    }
  },

  // Get shop by ID
  getShopById: async (shopId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync("SELECT * FROM shops WHERE id = ?", [
        ensureStringId(shopId),
      ]);
    } catch (error) {
      console.error("Error getting shop by ID:", error);
      return null;
    }
  },

  // Get shop by server ID
  getShopByServerId: async (serverId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync("SELECT * FROM shops WHERE server_id = ?", [
        ensureStringId(serverId),
      ]);
    } catch (error) {
      console.error("Error getting shop by server ID:", error);
      return null;
    }
  },

  // Get shops accessible by user (through business ownership or employment)
  getUserShops: async (userId) => {
    try {
      const db = await openDatabase();

      // Get shops from businesses owned by user
      const ownedShops = await db.getAllAsync(
        `SELECT s.* FROM shops s
         INNER JOIN businesses b ON s.business_id = b.id
         WHERE b.owner_id = ? AND s.is_active = 1`,
        [ensureStringId(userId)]
      );

      // Get shops where user is employed
      const employeeShops = await db.getAllAsync(
        `SELECT s.* FROM shops s
         INNER JOIN employees e ON s.business_id = e.business_id
         WHERE e.user_id = ? AND e.is_active = 1 AND s.is_active = 1`,
        [ensureStringId(userId)]
      );

      // Combine and remove duplicates
      const allShops = [...ownedShops, ...employeeShops];
      const uniqueShops = allShops.filter(
        (shop, index, self) => index === self.findIndex((s) => s.id === shop.id)
      );

      return uniqueShops;
    } catch (error) {
      console.error("Error getting user shops:", error);
      return [];
    }
  },

  // Get pending sync shops
  getPendingSyncShops: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM shops WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync shops:", error);
      return [];
    }
  },

  // Mark shop as synced
  markAsSynced: async (localId, serverId) => {
    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE shops SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = "synced" WHERE id = ?',
        [
          ensureStringId(serverId),
          new Date().toISOString(),
          ensureStringId(localId),
        ]
      );
      return true;
    } catch (error) {
      console.error("Error marking shop as synced:", error);
      return false;
    }
  },
};

// Role Service - NEW SERVICE FOR HANDLING ROLES
export const RoleService = {
  // Save role to local database
  saveRole: async (roleData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(roleData);
      const now = new Date().toISOString();

      // IMPORTANT: Use server_id as the local id for UUID consistency
      const roleId = normalizedData.server_id || normalizedData.id || nanoid();
      
      // Check if role already exists by server_id
      const existingRole = await db.getFirstAsync(
        "SELECT id FROM roles WHERE server_id = ? OR (name = ? AND role_type = ?)",
        [
          normalizedData.server_id || normalizedData.id,
          normalizedData.name,
          normalizedData.role_type,
        ]
      );

      if (existingRole) {
        // Update existing role
        await db.runAsync(
          `UPDATE roles SET
            name = ?,
            role_type = ?,
            description = ?,
            is_default = ?,
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.name,
            normalizedData.role_type,
            normalizedData.description || "",
            normalizedData.is_default ? 1 : 0,
            now,
            now,
            existingRole.id,
          ]
        );
        return { success: true, id: existingRole.id, action: "updated" };
      } else {
        // Insert new role - use server_id as id if available
        const finalRoleId = normalizedData.server_id || roleId;
        
        await db.runAsync(
          `INSERT INTO roles (
            id, server_id, name, role_type, description, is_default,
            created_at, updated_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finalRoleId, // Use server_id as local id
            normalizedData.server_id || normalizedData.id || null,
            normalizedData.name,
            normalizedData.role_type,
            normalizedData.description || "",
            normalizedData.is_default ? 1 : 0,
            now,
            now,
            now,
            "synced",
            0,
          ]
        );
        console.log(`✅ Saved role: ${normalizedData.name} with ID: ${finalRoleId}`);
        return { success: true, id: finalRoleId, action: "created" };
      }
    } catch (error) {
      console.error("Error saving role:", error);
      return { success: false, error: error.message };
    }
  },

  // Get all roles
  getRoles: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM roles ORDER BY name ASC"
      );
    } catch (error) {
      console.error("Error getting roles:", error);
      return [];
    }
  },

  // Get role by ID
  getRoleById: async (roleId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync(
        "SELECT * FROM roles WHERE id = ? OR server_id = ?",
        [ensureStringId(roleId), ensureStringId(roleId)]
      );
    } catch (error) {
      console.error("Error getting role by ID:", error);
      return null;
    }
  },

  // Get role by server ID
  getRoleByServerId: async (serverId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync(
        "SELECT * FROM roles WHERE server_id = ?",
        [ensureStringId(serverId)]
      );
    } catch (error) {
      console.error("Error getting role by server ID:", error);
      return null;
    }
  },

  // Get role by type
  getRoleByType: async (roleType) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync(
        "SELECT * FROM roles WHERE role_type = ?",
        [roleType]
      );
    } catch (error) {
      console.error("Error getting role by type:", error);
      return null;
    }
  },

  // Get pending sync roles
  getPendingSyncRoles: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM roles WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync roles:", error);
      return [];
    }
  },

  // Mark role as synced
  markAsSynced: async (localId, serverId) => {
    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE roles SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = "synced" WHERE id = ?',
        [
          ensureStringId(serverId),
          new Date().toISOString(),
          ensureStringId(localId),
        ]
      );
      return true;
    } catch (error) {
      console.error("Error marking role as synced:", error);
      return false;
    }
  },

  // Seed default roles - UPDATED to use proper UUIDs
  seedDefaultRoles: async () => {
    try {
      const defaultRoles = [
        {
          id: uuid.v4(), // Generate a UUID
          name: "Shop Owner",
          role_type: "owner",
          description: "Full access to all features and settings",
          is_default: true,
        },
        {
          id: uuid.v4(), // Generate a UUID
          name: "Shop Manager",
          role_type: "manager",
          description: "Can manage employees, inventory, and sales",
          is_default: true,
        },
        {
          id: uuid.v4(), // Generate a UUID
          name: "Cashier",
          role_type: "cashier",
          description: "Can process sales and view inventory",
          is_default: true,
        },
        {
          id: uuid.v4(), // Generate a UUID
          name: "Stock Keeper",
          role_type: "stock_keeper",
          description: "Can manage inventory and stock levels",
          is_default: true,
        },
        {
          id: uuid.v4(), // Generate a UUID
          name: "Sales Attendant",
          role_type: "attendant",
          description: "Can assist customers and process sales",
          is_default: true,
        },
      ];

      const db = await openDatabase();
      const now = new Date().toISOString();

      for (const roleData of defaultRoles) {
        // Check if role already exists
        const existingRole = await db.getFirstAsync(
          "SELECT id FROM roles WHERE role_type = ?",
          [roleData.role_type]
        );

        if (!existingRole) {
          await db.runAsync(
            `INSERT INTO roles (
              id, server_id, name, role_type, description, is_default,
              created_at, updated_at, synced_at, sync_status, is_dirty
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              roleData.id,
              roleData.id, // Same as server_id
              roleData.name,
              roleData.role_type,
              roleData.description,
              roleData.is_default ? 1 : 0,
              now,
              now,
              now,
              "synced",
              0,
            ]
          );
          console.log(`✅ Seeded default role: ${roleData.name} with UUID: ${roleData.id}`);
        }
      }

      return { success: true, message: "Default roles seeded successfully" };
    } catch (error) {
      console.error("Error seeding default roles:", error);
      return { success: false, error: error.message };
    }
  },
};

// Add this function to fix UUID conversion
export const fixRoleUUIDs = async () => {
  try {
    const db = await openDatabase();
    console.log('🔧 Fixing role UUIDs in local database...');
    
    // Get all roles
    const roles = await db.getAllAsync('SELECT id, server_id FROM roles');
    
    for (const role of roles) {
      // If server_id exists and is a UUID, but id is a nanoid
      if (role.server_id && role.server_id.length === 36) { // UUID with hyphens
        // Update the local id to match server_id
        await db.runAsync(
          'UPDATE roles SET id = ? WHERE ROWID = ?',
          [role.server_id, role.id]
        );
        console.log(`✅ Updated role ${role.id} to use server UUID`);
      } else if (role.server_id && role.server_id.length === 32) { // UUID without hyphens
        // Convert to UUID with hyphens
        const formattedUUID = `${role.server_id.slice(0,8)}-${role.server_id.slice(8,12)}-${role.server_id.slice(12,16)}-${role.server_id.slice(16,20)}-${role.server_id.slice(20)}`;
        await db.runAsync(
          'UPDATE roles SET id = ? WHERE ROWID = ?',
          [formattedUUID, role.id]
        );
        console.log(`✅ Updated role ${role.id} to formatted UUID`);
      }
    }
    
    return { success: true, message: 'Role UUIDs fixed successfully' };
  } catch (error) {
    console.error('❌ Error fixing role UUIDs:', error);
    return { success: false, error: error.message };
  }
};

// Employee Service - UPDATED WITH FIXED QUERIES
export const EmployeeService = {
  // Create new employee
  createEmployee: async (employeeData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(employeeData);
      const employeeId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      // CRITICAL: Ensure business_id is provided
      if (!normalizedData.business_id) {
        throw new Error('business_id is required for creating an employee');
      }

      // Check if employee already exists (by email in the same business)
      const existingEmployee = await db.getFirstAsync(
        `SELECT e.id FROM employees e 
        INNER JOIN users u ON e.user_id = u.id 
        WHERE u.email = ? AND e.business_id = ? AND e.is_active = 1`,
        [
          normalizedData.email,
          ensureStringId(normalizedData.business_id),
        ]
      );

      if (existingEmployee) {
        throw new Error('Employee with this email already exists in this business');
      }

      // Create user record if user_id is not provided
      let userId = normalizedData.user_id;
      if (!userId) {
        // Create a minimal user record
        const userData = {
          username: normalizedData.email.split('@')[0] + '_' + Date.now().toString().slice(-6),
          email: normalizedData.email,
          first_name: normalizedData.first_name,
          last_name: normalizedData.last_name,
          phone_number: normalizedData.phone_number || "",
          user_type: "employee",
          is_active: 1,
        };

        const userResult = await UserService.saveUser(userData);
        userId = userResult.id;
      }

      // Insert employee record
      await db.runAsync(
        `INSERT INTO employees (
          id, server_id, user_id, business_id, shop_id, role_id,
          first_name, last_name, email, phone_number, employment_type,
          salary, is_active, employment_date, sync_status, is_dirty,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          normalizedData.server_id || null,
          ensureStringId(userId),
          ensureStringId(normalizedData.business_id), // ← BUSINESS ID IS REQUIRED
          normalizedData.shop_id ? ensureStringId(normalizedData.shop_id) : null,
          ensureStringId(normalizedData.role_id),
          normalizedData.first_name,
          normalizedData.last_name,
          normalizedData.email,
          normalizedData.phone_number || "",
          normalizedData.employment_type || "full_time",
          normalizedData.salary || null,
          1, // is_active
          normalizedData.employment_date || now,
          normalizedData.server_id ? "synced" : "pending",
          normalizedData.server_id ? 0 : 1,
          now,
          now,
        ]
      );

      // Update shop employee count if shop_id is provided
      if (normalizedData.shop_id) {
        const employeeCount = await db.getFirstAsync(
          "SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1",
          [ensureStringId(normalizedData.shop_id)]
        );

        await db.runAsync(
          "UPDATE shops SET employee_count = ?, updated_at = ? WHERE id = ?",
          [
            employeeCount?.count || 0,
            now,
            ensureStringId(normalizedData.shop_id),
          ]
        );
      }

      console.log(`✅ Employee created: ${normalizedData.first_name} ${normalizedData.last_name}`);
      return { success: true, id: employeeId };
    } catch (error) {
      console.error("❌ Error creating employee:", error);
      return { success: false, error: error.message };
    }
  },

  // Get employee by ID - FIXED QUERY
  getEmployeeById: async (employeeId) => {
    try {
      const db = await openDatabase();
      const employee = await db.getFirstAsync(
        `SELECT e.*, 
                r.name as role_name, r.role_type,
                s.name as shop_name,
                b.name as business_name,
                u.username,
                up.profile_picture  -- Get from user_profiles
         FROM employees e
         LEFT JOIN roles r ON e.role_id = r.id
         LEFT JOIN shops s ON e.shop_id = s.id
         LEFT JOIN businesses b ON e.business_id = b.id
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN user_profiles up ON u.id = up.user_id  -- Join with user_profiles
         WHERE e.id = ?`,
        [ensureStringId(employeeId)]
      );
      return employee;
    } catch (error) {
      console.error("Error getting employee by ID:", error);
      return null;
    }
  },

  // Get employees by business - FIXED QUERY
  getEmployeesByBusiness: async (businessId) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT e.*, 
                r.name as role_name, r.role_type,
                s.name as shop_name,
                u.username,
                up.profile_picture  -- Get from user_profiles
         FROM employees e
         LEFT JOIN roles r ON e.role_id = r.id
         LEFT JOIN shops s ON e.shop_id = s.id
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN user_profiles up ON u.id = up.user_id  -- Join with user_profiles
         WHERE e.business_id = ? AND e.is_active = 1
         ORDER BY e.created_at DESC`,
        [ensureStringId(businessId)]
      );
    } catch (error) {
      console.error("Error getting employees by business:", error);
      return [];
    }
  },

  // Get employees by shop - FIXED QUERY
  getEmployeesByShop: async (shopId) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT e.*, 
                r.name as role_name, r.role_type,
                u.username,
                up.profile_picture,  -- Get from user_profiles
                u.phone_number
         FROM employees e
         LEFT JOIN roles r ON e.role_id = r.id
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN user_profiles up ON u.id = up.user_id  -- Join with user_profiles
         WHERE e.shop_id = ? AND e.is_active = 1
         ORDER BY e.created_at DESC`,
        [ensureStringId(shopId)]
      );
    } catch (error) {
      console.error("Error getting employees by shop:", error);
      return [];
    }
  },

  // Update employee
  updateEmployee: async (employeeId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const employeeIdStr = ensureStringId(employeeId);

      // Get current employee to check for shop changes
      const currentEmployee = await EmployeeService.getEmployeeById(employeeIdStr);
      if (!currentEmployee) {
        throw new Error("Employee not found");
      }

      // Build update query
      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === "salary" && updates[field] !== null) {
          return parseFloat(updates[field]);
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE employees SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [...values, now, employeeIdStr]
      );

      // Update shop employee counts if shop_id changed
      if (updates.shop_id !== undefined) {
        const oldShopId = currentEmployee.shop_id;
        const newShopId = updates.shop_id;

        // Update old shop count
        if (oldShopId) {
          const oldShopCount = await db.getFirstAsync(
            "SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1",
            [ensureStringId(oldShopId)]
          );
          await db.runAsync(
            "UPDATE shops SET employee_count = ?, updated_at = ? WHERE id = ?",
            [oldShopCount?.count || 0, now, ensureStringId(oldShopId)]
          );
        }

        // Update new shop count
        if (newShopId) {
          const newShopCount = await db.getFirstAsync(
            "SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1",
            [ensureStringId(newShopId)]
          );
          await db.runAsync(
            "UPDATE shops SET employee_count = ?, updated_at = ? WHERE id = ?",
            [newShopCount?.count || 0, now, ensureStringId(newShopId)]
          );
        }
      }

      // Get updated employee
      const updatedEmployee = await EmployeeService.getEmployeeById(employeeIdStr);

      return { success: true, employee: updatedEmployee };
    } catch (error) {
      console.error("Error updating employee:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete employee (soft delete)
  deleteEmployee: async (employeeId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const employeeIdStr = ensureStringId(employeeId);

      // Get employee to get shop_id for updating count
      const employee = await EmployeeService.getEmployeeById(employeeIdStr);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Soft delete
      await db.runAsync(
        'UPDATE employees SET is_active = 0, termination_date = ?, updated_at = ?, sync_status = "pending", is_dirty = 1 WHERE id = ?',
        [now, now, employeeIdStr]
      );

      // Update shop employee count if employee was assigned to a shop
      if (employee.shop_id) {
        const employeeCount = await db.getFirstAsync(
          "SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND is_active = 1",
          [ensureStringId(employee.shop_id)]
        );

        await db.runAsync(
          "UPDATE shops SET employee_count = ?, updated_at = ? WHERE id = ?",
          [employeeCount?.count || 0, now, ensureStringId(employee.shop_id)]
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting employee:", error);
      return { success: false, error: error.message };
    }
  },

  // Create or update employee (for syncing from server)
  createOrUpdateEmployee: async (employeeData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(employeeData);
      const now = new Date().toISOString();

      // Check if employee exists by server_id
      let existingEmployee = null;

      if (normalizedData.server_id) {
        existingEmployee = await db.getFirstAsync(
          "SELECT id FROM employees WHERE server_id = ?",
          [normalizedData.server_id]
        );
      }

      // Also check by email and business_id
      if (!existingEmployee && normalizedData.email && normalizedData.business_id) {
        existingEmployee = await db.getFirstAsync(
          `SELECT e.id FROM employees e 
           WHERE e.email = ? AND e.business_id = ?`,
          [
            normalizedData.email,
            ensureStringId(normalizedData.business_id),
          ]
        );
      }

      if (existingEmployee) {
        // Update existing employee
        const fields = Object.keys(normalizedData);
        const values = fields.map((field) => normalizedData[field]);
        const setClause = fields.map((field) => `${field} = ?`).join(", ");

        await db.runAsync(
          `UPDATE employees SET ${setClause}, updated_at = ?, sync_status = 'synced', is_dirty = 0 WHERE id = ?`,
          [...values, now, existingEmployee.id]
        );

        return { success: true, id: existingEmployee.id, action: "updated" };
      } else {
        // Create new employee
        const employeeId = nanoid();

        // Create or find user
        let userId = normalizedData.user_id;
        if (!userId && normalizedData.email) {
          // Check if user exists by email
          const existingUser = await db.getFirstAsync(
            "SELECT id FROM users WHERE email = ?",
            [normalizedData.email]
          );

          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Create new user
            const userData = {
              email: normalizedData.email,
              username: normalizedData.email.split('@')[0],
              first_name: normalizedData.first_name || "",
              last_name: normalizedData.last_name || "",
              phone_number: normalizedData.phone_number || "",
              user_type: "employee",
              is_active: 1,
            };
            const userResult = await UserService.saveUser(userData);
            userId = userResult.id;
          }
        }

        await db.runAsync(
          `INSERT INTO employees (
            id, server_id, user_id, business_id, shop_id, role_id,
            first_name, last_name, email, phone_number, employment_type,
            salary, is_active, employment_date, sync_status, is_dirty,
            created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employeeId,
            normalizedData.server_id || normalizedData.id || null,
            ensureStringId(userId || nanoid()),
            ensureStringId(normalizedData.business_id || ""),
            normalizedData.shop_id ? ensureStringId(normalizedData.shop_id) : null,
            ensureStringId(normalizedData.role_id || ""),
            normalizedData.first_name || "",
            normalizedData.last_name || "",
            normalizedData.email || "",
            normalizedData.phone_number || "",
            normalizedData.employment_type || "full_time",
            normalizedData.salary || null,
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.employment_date || now,
            "synced",
            0,
            normalizedData.created_at || now,
            now,
            now,
          ]
        );

        return { success: true, id: employeeId, action: "created" };
      }
    } catch (error) {
      console.error("Error creating/updating employee:", error);
      return { success: false, error: error.message };
    }
  },

  // Get pending sync employees
  getPendingSyncEmployees: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM employees WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync employees:", error);
      return [];
    }
  },

  // Mark employee as synced
  markAsSynced: async (localId, serverId) => {
    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE employees SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = "synced" WHERE id = ?',
        [
          ensureStringId(serverId),
          new Date().toISOString(),
          ensureStringId(localId),
        ]
      );
      return true;
    } catch (error) {
      console.error("Error marking employee as synced:", error);
      return false;
    }
  },

  // Check if user has access to a business
  checkUserBusinessAccess: async (userId, businessId) => {
    try {
      const db = await openDatabase();

      // Check if user owns the business
      const isOwner = await db.getFirstAsync(
        "SELECT id FROM businesses WHERE owner_id = ? AND id = ? AND is_active = 1",
        [ensureStringId(userId), ensureStringId(businessId)]
      );

      if (isOwner) return true;

      // Check if user is an employee in the business
      const isEmployee = await db.getFirstAsync(
        "SELECT id FROM employees WHERE user_id = ? AND business_id = ? AND is_active = 1",
        [ensureStringId(userId), ensureStringId(businessId)]
      );

      return !!isEmployee;
    } catch (error) {
      console.error("Error checking user business access:", error);
      return false;
    }
  },

  // Get user's employment in a business
  getUserEmployment: async (userId, businessId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync(
        `SELECT e.*, r.name as role_name, r.role_type,
                s.name as shop_name
         FROM employees e
         LEFT JOIN roles r ON e.role_id = r.id
         LEFT JOIN shops s ON e.shop_id = s.id
         WHERE e.user_id = ? AND e.business_id = ? AND e.is_active = 1`,
        [ensureStringId(userId), ensureStringId(businessId)]
      );
    } catch (error) {
      console.error("Error getting user employment:", error);
      return null;
    }
  },

  // Get all employees for a user (across all businesses) - FIXED QUERY
  getUserEmployees: async (userId) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT e.*, 
                r.name as role_name, r.role_type,
                s.name as shop_name,
                b.name as business_name,
                up.profile_picture  -- Get from user_profiles
         FROM employees e
         LEFT JOIN roles r ON e.role_id = r.id
         LEFT JOIN shops s ON e.shop_id = s.id
         LEFT JOIN businesses b ON e.business_id = b.id
         LEFT JOIN user_profiles up ON e.user_id = up.user_id  -- Join with user_profiles
         WHERE e.user_id = ? AND e.is_active = 1
         ORDER BY e.created_at DESC`,
        [ensureStringId(userId)]
      );
    } catch (error) {
      console.error("Error getting user employees:", error);
      return [];
    }
  },
};

// NEW: Tax Service
export const TaxService = {
  // Save tax to local database
  saveTax: async (taxData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(taxData);
      const now = new Date().toISOString();

      // Use server_id as local id for UUID consistency
      const taxId = normalizedData.server_id || normalizedData.id || uuid.v4();
      
      // Check if tax already exists
      const existingTax = await db.getFirstAsync(
        "SELECT id FROM taxes WHERE server_id = ? OR (name = ? AND rate = ?)",
        [
          normalizedData.server_id || normalizedData.id,
          normalizedData.name,
          normalizedData.rate,
        ]
      );

      if (existingTax) {
        // Update existing tax
        await db.runAsync(
          `UPDATE taxes SET
            name = ?,
            rate = ?,
            tax_type = ?,
            is_active = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.name,
            normalizedData.rate,
            normalizedData.tax_type || 'standard',
            normalizedData.is_active !== false ? 1 : 0,
            now,
            existingTax.id,
          ]
        );
        return { success: true, id: existingTax.id, action: "updated" };
      } else {
        // Insert new tax
        await db.runAsync(
          `INSERT INTO taxes (
            id, server_id, name, rate, tax_type, is_active,
            created_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taxId,
            normalizedData.server_id || normalizedData.id || null,
            normalizedData.name,
            normalizedData.rate,
            normalizedData.tax_type || 'standard',
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.created_at || now,
            now,
            "synced",
            0,
          ]
        );
        console.log(`✅ Saved tax: ${normalizedData.name} (${normalizedData.rate}%)`);
        return { success: true, id: taxId, action: "created" };
      }
    } catch (error) {
      console.error("Error saving tax:", error);
      return { success: false, error: error.message };
    }
  },

  // Get all taxes
  getTaxes: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM taxes WHERE is_active = 1 ORDER BY name ASC"
      );
    } catch (error) {
      console.error("Error getting taxes:", error);
      return [];
    }
  },

  // Get tax by ID
  getTaxById: async (taxId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync(
        "SELECT * FROM taxes WHERE id = ? OR server_id = ?",
        [ensureStringId(taxId), ensureStringId(taxId)]
      );
    } catch (error) {
      console.error("Error getting tax by ID:", error);
      return null;
    }
  },

  // Get pending sync taxes
  getPendingSyncTaxes: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM taxes WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync taxes:", error);
      return [];
    }
  },

  // Mark tax as synced
  markAsSynced: async (localId, serverId) => {
    return BaseService.markAsSynced('taxes', localId, serverId);
  },

  // Seed default taxes
  seedDefaultTaxes: async () => {
    try {
      const defaultTaxes = [
        {
          name: "VAT 16%",
          rate: 16.0,
          tax_type: "standard",
          is_active: true,
        },
        {
          name: "Zero Rated",
          rate: 0.0,
          tax_type: "zero",
          is_active: true,
        },
        {
          name: "Exempt",
          rate: 0.0,
          tax_type: "exempt",
          is_active: true,
        },
      ];

      for (const taxData of defaultTaxes) {
        await TaxService.saveTax({
          ...taxData,
          id: uuid.v4(),
        });
      }

      return { success: true, message: "Default taxes seeded successfully" };
    } catch (error) {
      console.error("Error seeding default taxes:", error);
      return { success: false, error: error.message };
    }
  },
};

// UPDATED: Category Service
export const CategoryService = {
  // Create or update category
  saveCategory: async (categoryData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(categoryData);
      const now = new Date().toISOString();

      // Verify user has access to the business
      const hasAccess = await EmployeeService.checkUserBusinessAccess(
        userId,
        normalizedData.business_id
      );

      if (!hasAccess && normalizedData.business_id) {
        // Also check if user owns the business
        const business = await BusinessService.getBusinessById(normalizedData.business_id);
        if (!business || business.owner_id !== userId) {
          throw new Error("You don't have access to this business");
        }
      }

      // Use server_id as local id for UUID consistency
      const categoryId = normalizedData.server_id || normalizedData.id || uuid.v4();
      
      // Check if category already exists
      const existingCategory = await db.getFirstAsync(
        "SELECT id FROM categories WHERE server_id = ? OR (business_id = ? AND name = ?)",
        [
          normalizedData.server_id || normalizedData.id,
          ensureStringId(normalizedData.business_id),
          normalizedData.name,
        ]
      );

      if (existingCategory) {
        // Update existing category
        await db.runAsync(
          `UPDATE categories SET
            business_server_id = ?,
            name = ?,
            description = ?,
            parent_id = ?,
            color = ?,
            image = ?,
            is_active = ?,
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.business || normalizedData.business_server_id,
            normalizedData.name,
            normalizedData.description || '',
            normalizedData.parent_id ? ensureStringId(normalizedData.parent_id) : null,
            normalizedData.color || '#FF6B35',
            normalizedData.image || null,
            normalizedData.is_active !== false ? 1 : 0,
            now,
            now,
            existingCategory.id,
          ]
        );
        return { success: true, id: existingCategory.id, action: "updated" };
      } else {
        // Get business server_id if available
        let businessServerId = normalizedData.business;
        if (!businessServerId && normalizedData.business_id) {
          const business = await BusinessService.getBusinessById(normalizedData.business_id);
          businessServerId = business?.server_id || null;
        }

        // Insert new category
        await db.runAsync(
          `INSERT INTO categories (
            id, server_id, business_id, business_server_id, name, description,
            parent_id, color, image, is_active, created_at, updated_at,
            synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryId,
            normalizedData.server_id || normalizedData.id || null,
            ensureStringId(normalizedData.business_id),
            businessServerId,
            normalizedData.name,
            normalizedData.description || '',
            normalizedData.parent_id ? ensureStringId(normalizedData.parent_id) : null,
            normalizedData.color || '#FF6B35',
            normalizedData.image || null,
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.created_at || now,
            now,
            now,
            "synced",
            0,
          ]
        );
        console.log(`✅ Saved category: ${normalizedData.name} for business ${normalizedData.business_id}`);
        return { success: true, id: categoryId, action: "created" };
      }
    } catch (error) {
      console.error("Error saving category:", error);
      return { success: false, error: error.message };
    }
  },

  // In your current CategoryService.getCategoriesByBusiness method:
  getCategoriesByBusiness: async (businessId, userId) => {
    try {
      const db = await openDatabase();
      
      return await db.getAllAsync(
        `SELECT c.*
         FROM categories c
         WHERE c.business_id = ? 
           AND c.is_active = 1
         ORDER BY c.name`,
        [ensureStringId(businessId)]
      );
    } catch (error) {
      console.error("Error getting categories by business:", error);
      return [];
    }
  },

  // Get category by ID with access check
  getCategoryById: async (categoryId, userId) => {
    try {
      const db = await openDatabase();
      const category = await db.getFirstAsync(
        `SELECT c.* FROM categories c
         WHERE c.id = ? AND c.is_active = 1`,
        [ensureStringId(categoryId)]
      );

      if (!category) return null;

      // Verify user has access to the business
      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, category.business_id);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(category.business_id);
        if (!business || business.owner_id !== userId) {
          return null;
        }
      }

      return category;
    } catch (error) {
      console.error("Error getting category by ID:", error);
      return null;
    }
  },

  // Update category with access check
  updateCategory: async (categoryId, updates, userId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const categoryIdStr = ensureStringId(categoryId);

      // Get category to check business access
      const category = await CategoryService.getCategoryById(categoryIdStr, userId);
      if (!category) {
        throw new Error("Category not found or access denied");
      }

      const fields = Object.keys(updates);
      const values = fields.map((field) => updates[field]);
      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE categories SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [...values, now, categoryIdStr]
      );

      return { success: true };
    } catch (error) {
      console.error("Error updating category:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete category (soft delete) with access check
  deleteCategory: async (categoryId, userId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const categoryIdStr = ensureStringId(categoryId);

      // Get category to check business access
      const category = await CategoryService.getCategoryById(categoryIdStr, userId);
      if (!category) {
        throw new Error("Category not found or access denied");
      }

      await db.runAsync(
        'UPDATE categories SET is_active = 0, updated_at = ?, sync_status = "pending", is_dirty = 1 WHERE id = ?',
        [now, categoryIdStr]
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting category:", error);
      return { success: false, error: error.message };
    }
  },

  // Get pending sync categories
  getPendingSyncCategories: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM categories WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync categories:", error);
      return [];
    }
  },

  // Mark category as synced
  markAsSynced: async (localId, serverId) => {
    return BaseService.markAsSynced('categories', localId, serverId);
  },
};

// UPDATED: Product Service - Only user-specific products
export const ProductService = {
  // Create product with access check
  createProduct: async (productData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(productData);
      const productId = normalizedData.id || uuid.v4();
      const now = new Date().toISOString();

      // Verify user has access to the business
      if (normalizedData.business_id) {
        const hasAccess = await EmployeeService.checkUserBusinessAccess(
          userId,
          normalizedData.business_id
        );

        if (!hasAccess) {
          const business = await BusinessService.getBusinessById(normalizedData.business_id);
          if (!business || business.owner_id !== userId) {
            throw new Error("You don't have access to this business");
          }
        }
      }

      // Get business server_id if available
      let businessServerId = normalizedData.business;
      if (!businessServerId && normalizedData.business_id) {
        const business = await BusinessService.getBusinessById(normalizedData.business_id);
        businessServerId = business?.server_id || null;
      }

      // Insert product
      await db.runAsync(
        `INSERT INTO products (
          id, server_id, business_id, business_server_id, name, description, category_id,
          product_type, has_variants, variant_type, base_barcode, base_sku,
          base_cost_price, base_selling_price, base_wholesale_price, tax_id,
          tax_inclusive, unit_of_measure, reorder_level, is_trackable, image,
          is_active, created_by, created_at, updated_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          normalizedData.server_id || null,
          ensureStringId(normalizedData.business_id),
          businessServerId,
          normalizedData.name || "",
          normalizedData.description || "",
          normalizedData.category_id ? ensureStringId(normalizedData.category_id) : null,
          normalizedData.product_type || "physical",
          normalizedData.has_variants ? 1 : 0,
          normalizedData.variant_type || "none",
          normalizedData.base_barcode || null,
          normalizedData.base_sku || null,
          normalizedData.base_cost_price || null,
          normalizedData.base_selling_price || null,
          normalizedData.base_wholesale_price || null,
          normalizedData.tax_id ? ensureStringId(normalizedData.tax_id) : null,
          normalizedData.tax_inclusive !== false ? 1 : 0,
          normalizedData.unit_of_measure || "pcs",
          normalizedData.reorder_level || 10,
          normalizedData.is_trackable !== false ? 1 : 0,
          normalizedData.image || null,
          normalizedData.is_active !== false ? 1 : 1,
          ensureStringId(userId),
          now,
          now,
          "pending",
          1,
        ]
      );

      console.log(`✅ Created product: ${normalizedData.name} for user ${userId}`);
      return { success: true, id: productId };
    } catch (error) {
      console.error("Error creating product:", error);
      return { success: false, error: error.message };
    }
  },

  // Get products by business (user-specific)
  getProductsByBusiness: async (businessId, userId, options = {}) => {
    try {
      const db = await openDatabase();

      // Verify user has access to this business
      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, businessId);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(businessId);
        if (!business || business.owner_id !== userId) {
          console.warn(`User ${userId} doesn't have access to business ${businessId}`);
          return [];
        }
      }

      const {
        includeInactive = false,
        search = '',
        categoryId = null,
        hasVariants = null,
        limit = null,
        offset = 0,
        shopId = null
      } = options;

      let whereClause = "p.business_id = ?";
      const params = [ensureStringId(businessId)];

      if (!includeInactive) {
        whereClause += " AND p.is_active = 1";
      }

      if (search) {
        whereClause += " AND (p.name LIKE ? OR p.description LIKE ? OR p.base_sku LIKE ? OR p.base_barcode LIKE ?)";
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (categoryId) {
        whereClause += " AND p.category_id = ?";
        params.push(ensureStringId(categoryId));
      }

      if (hasVariants !== null) {
        whereClause += " AND p.has_variants = ?";
        params.push(hasVariants ? 1 : 0);
      }

      let limitClause = "";
      if (limit) {
        limitClause = `LIMIT ${limit} OFFSET ${offset}`;
      }

      // Get current shop if shopId not provided
      let currentShopId = shopId;
      if (!currentShopId) {
        const shop = await ShopService.getCurrentShop(userId);
        if (shop) {
          currentShopId = shop.id;
        }
      }

      // Get products with inventory
      let query = `
        SELECT p.*, 
              c.name as category_name,
              c.color as category_color,
              t.name as tax_name,
              t.rate as tax_rate,
              t.tax_type,
              u.username as creator_username
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN taxes t ON p.tax_id = t.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE ${whereClause}
        ORDER BY p.created_at DESC
        ${limitClause}`;

      const products = await db.getAllAsync(query, params);

      // Add inventory for each product
      const productsWithInventory = await Promise.all(
        products.map(async (product) => {
          let totalStock = 0;
          
          if (product.has_variants === 1 && currentShopId) {
            // Get all variants and sum their inventory
            const variants = await db.getAllAsync(
              `SELECT id FROM product_variants WHERE product_id = ? AND is_active = 1`,
              [ensureStringId(product.id)]
            );
            
            for (const variant of variants) {
              const variantInventory = await db.getFirstAsync(
                `SELECT current_stock FROM inventory 
                 WHERE variant_id = ? AND shop_id = ? AND is_active = 1`,
                [ensureStringId(variant.id), ensureStringId(currentShopId)]
              );
              
              if (variantInventory) {
                totalStock += variantInventory.current_stock || 0;
              }
            }
            
            // Add total stock as a field
            product.total_stock = totalStock;
          } else if (currentShopId) {
            // Get simple product inventory
            const inventory = await db.getFirstAsync(
              `SELECT current_stock FROM inventory 
               WHERE product_id = ? AND shop_id = ? AND is_active = 1`,
              [ensureStringId(product.id), ensureStringId(currentShopId)]
            );
            
            if (inventory) {
              product.total_stock = inventory.current_stock || 0;
            } else {
              product.total_stock = 0;
            }
          } else {
            product.total_stock = 0;
          }
          
          return product;
        })
      );

      return productsWithInventory;
    } catch (error) {
      console.error("Error getting products by business:", error);
      return [];
    }
  },

  // Get product by ID with access check
  getProductById: async (productId, userId) => {
    try {
      const db = await openDatabase();
      
      const product = await db.getFirstAsync(
        `SELECT p.*, 
                c.name as category_name,
                c.color as category_color,
                t.name as tax_name,
                t.rate as tax_rate,
                t.tax_type,
                u.username as creator_username
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN taxes t ON p.tax_id = t.id
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`,
        [ensureStringId(productId)]
      );

      if (!product) return null;

      // Verify user has access to the business
      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, product.business_id);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(product.business_id);
        if (!business || business.owner_id !== userId) {
          return null;
        }
      }

      return product;
    } catch (error) {
      console.error("Error getting product by ID:", error);
      return null;
    }
  },

  // Get product with variants and attributes
  getProductWithDetails: async (productId, userId) => {
    try {
      const product = await ProductService.getProductById(productId, userId);
      if (!product) return null;

      const db = await openDatabase();

      // Get variants if product has variants
      let variants = [];
      if (product.has_variants) {
        variants = await db.getAllAsync(
          `SELECT v.* FROM product_variants v
           WHERE v.product_id = ? AND v.is_active = 1
           ORDER BY v.is_default DESC, v.name`,
          [ensureStringId(productId)]
        );

        // Get variant attributes
        for (const variant of variants) {
          variant.attributes = await db.getAllAsync(
            `SELECT pa.name as attribute_name, pav.value as attribute_value
             FROM product_variant_attributes pva
             JOIN product_attributes pa ON pva.attribute_id = pa.id
             JOIN product_attribute_values pav ON pva.value_id = pav.id
             WHERE pva.variant_id = ?`,
            [ensureStringId(variant.id)]
          );
        }
      }

      // Get inventory for this product
      const inventory = await db.getAllAsync(
        `SELECT i.*, s.name as shop_name
         FROM inventory i
         JOIN shops s ON i.shop_id = s.id
         WHERE (i.product_id = ? OR i.variant_id IN (
           SELECT id FROM product_variants WHERE product_id = ?
         )) AND i.is_active = 1`,
        [ensureStringId(productId), ensureStringId(productId)]
      );

      // Get product images
      const images = await db.getAllAsync(
        `SELECT * FROM product_images
         WHERE product_id = ? AND variant_id IS NULL
         ORDER BY display_order, is_primary DESC`,
        [ensureStringId(productId)]
      );

      return {
        ...product,
        variants,
        inventory,
        images,
      };
    } catch (error) {
      console.error("Error getting product with details:", error);
      return null;
    }
  },

  // Update product with access check
  updateProduct: async (productId, updates, userId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const productIdStr = ensureStringId(productId);

      // Get product to check business access
      const product = await ProductService.getProductById(productIdStr, userId);
      if (!product) {
        throw new Error("Product not found or access denied");
      }

      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === 'has_variants' || field === 'tax_inclusive' || field === 'is_trackable' || field === 'is_active') {
          return updates[field] ? 1 : 0;
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE products SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [...values, now, productIdStr]
      );

      // Create price history entry if price changed
      if (updates.base_selling_price && updates.base_selling_price !== product.base_selling_price) {
        await PriceHistoryService.createPriceHistory({
          product_id: productIdStr,
          old_price: product.base_selling_price,
          new_price: updates.base_selling_price,
          price_type: 'selling',
          changed_by: userId,
          change_reason: updates.change_reason || 'Price update',
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating product:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete product (soft delete) with access check
  deleteProduct: async (productId, userId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const productIdStr = ensureStringId(productId);

      // Get product to check business access
      const product = await ProductService.getProductById(productIdStr, userId);
      if (!product) {
        throw new Error("Product not found or access denied");
      }

      await db.runAsync(
        'UPDATE products SET is_active = 0, updated_at = ?, sync_status = "pending", is_dirty = 1 WHERE id = ?',
        [now, productIdStr]
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting product:", error);
      return { success: false, error: error.message };
    }
  },

  // Search products (user-specific)
  searchProducts: async (businessId, userId, query, options = {}) => {
    try {
      const db = await openDatabase();

      // Verify user has access to this business
      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, businessId);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(businessId);
        if (!business || business.owner_id !== userId) {
          return [];
        }
      }

      const {
        shopId = null,
        includeInactive = false,
        limit = 50
      } = options;

      let whereClause = "p.business_id = ? AND (p.name LIKE ? OR p.description LIKE ? OR p.base_sku LIKE ? OR p.base_barcode LIKE ?)";
      const params = [
        ensureStringId(businessId),
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
        `%${query}%`
      ];

      if (!includeInactive) {
        whereClause += " AND p.is_active = 1";
      }

      // If shopId is provided, only show products with inventory in that shop
      if (shopId) {
        whereClause += ` AND (
          EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.shop_id = ? AND i.is_active = 1) OR
          EXISTS (SELECT 1 FROM product_variants v 
                   JOIN inventory i ON v.id = i.variant_id 
                   WHERE v.product_id = p.id AND i.shop_id = ? AND i.is_active = 1)
        )`;
        params.push(ensureStringId(shopId), ensureStringId(shopId));
      }

      return await db.getAllAsync(
        `SELECT DISTINCT p.*, 
                c.name as category_name,
                c.color as category_color,
                t.name as tax_name,
                t.rate as tax_rate
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN taxes t ON p.tax_id = t.id
         WHERE ${whereClause}
         ORDER BY p.name
         LIMIT ?`,
        [...params, limit]
      );
    } catch (error) {
      console.error("Error searching products:", error);
      return [];
    }
  },

  // Get pending sync products
  getPendingSyncProducts: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM products WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync products:", error);
      return [];
    }
  },

  // Mark product as synced
  markAsSynced: async (localId, serverId) => {
    return BaseService.markAsSynced('products', localId, serverId);
  },

  // Sync product from server (with user access check)
  syncProductFromServer: async (productData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(productData);
      const now = new Date().toISOString();

      // Check if user has access to the business
      const businessId = normalizedData.business_id;
      if (businessId) {
        const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, businessId);
        if (!hasAccess) {
          const business = await BusinessService.getBusinessById(businessId);
          if (!business || business.owner_id !== userId) {
            console.warn(`User ${userId} doesn't have access to sync product for business ${businessId}`);
            return { success: false, error: "Access denied" };
          }
        }
      }

      // Check if product exists
      let existingProduct = null;
      if (normalizedData.server_id) {
        existingProduct = await db.getFirstAsync(
          "SELECT id FROM products WHERE server_id = ?",
          [normalizedData.server_id]
        );
      }

      if (existingProduct) {
        // Update existing product
        await db.runAsync(
          `UPDATE products SET
            business_id = COALESCE(?, business_id),
            business_server_id = COALESCE(?, business_server_id),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            category_id = COALESCE(?, category_id),
            product_type = COALESCE(?, product_type),
            has_variants = COALESCE(?, has_variants),
            variant_type = COALESCE(?, variant_type),
            base_barcode = COALESCE(?, base_barcode),
            base_sku = COALESCE(?, base_sku),
            base_cost_price = COALESCE(?, base_cost_price),
            base_selling_price = COALESCE(?, base_selling_price),
            base_wholesale_price = COALESCE(?, base_wholesale_price),
            tax_id = COALESCE(?, tax_id),
            tax_inclusive = COALESCE(?, tax_inclusive),
            unit_of_measure = COALESCE(?, unit_of_measure),
            reorder_level = COALESCE(?, reorder_level),
            is_trackable = COALESCE(?, is_trackable),
            image = COALESCE(?, image),
            is_active = COALESCE(?, is_active),
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.business_id ? ensureStringId(normalizedData.business_id) : null,
            normalizedData.business || normalizedData.business_server_id,
            normalizedData.name,
            normalizedData.description || '',
            normalizedData.category_id ? ensureStringId(normalizedData.category_id) : null,
            normalizedData.product_type || 'physical',
            normalizedData.has_variants ? 1 : 0,
            normalizedData.variant_type || 'none',
            normalizedData.base_barcode,
            normalizedData.base_sku,
            normalizedData.base_cost_price,
            normalizedData.base_selling_price,
            normalizedData.base_wholesale_price,
            normalizedData.tax_id ? ensureStringId(normalizedData.tax_id) : null,
            normalizedData.tax_inclusive !== false ? 1 : 0,
            normalizedData.unit_of_measure || 'pcs',
            normalizedData.reorder_level || 10,
            normalizedData.is_trackable !== false ? 1 : 0,
            normalizedData.image,
            normalizedData.is_active !== false ? 1 : 0,
            now,
            now,
            existingProduct.id,
          ]
        );

        return { success: true, id: existingProduct.id, action: "updated" };
      } else {
        // Create new product
        const productId = uuid.v4();

        // Get business server_id if available
        let businessServerId = normalizedData.business;
        if (!businessServerId && normalizedData.business_id) {
          const business = await BusinessService.getBusinessById(normalizedData.business_id);
          businessServerId = business?.server_id || null;
        }

        await db.runAsync(
          `INSERT INTO products (
            id, server_id, business_id, business_server_id, name, description, category_id,
            product_type, has_variants, variant_type, base_barcode, base_sku,
            base_cost_price, base_selling_price, base_wholesale_price, tax_id,
            tax_inclusive, unit_of_measure, reorder_level, is_trackable, image,
            is_active, created_by, created_at, updated_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            normalizedData.server_id || normalizedData.id || null,
            normalizedData.business_id ? ensureStringId(normalizedData.business_id) : null,
            businessServerId,
            normalizedData.name || '',
            normalizedData.description || '',
            normalizedData.category_id ? ensureStringId(normalizedData.category_id) : null,
            normalizedData.product_type || 'physical',
            normalizedData.has_variants ? 1 : 0,
            normalizedData.variant_type || 'none',
            normalizedData.base_barcode || null,
            normalizedData.base_sku || null,
            normalizedData.base_cost_price || null,
            normalizedData.base_selling_price || null,
            normalizedData.base_wholesale_price || null,
            normalizedData.tax_id ? ensureStringId(normalizedData.tax_id) : null,
            normalizedData.tax_inclusive !== false ? 1 : 0,
            normalizedData.unit_of_measure || 'pcs',
            normalizedData.reorder_level || 10,
            normalizedData.is_trackable !== false ? 1 : 0,
            normalizedData.image || null,
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.created_by ? ensureStringId(normalizedData.created_by) : null,
            normalizedData.created_at || now,
            now,
            now,
            "synced",
            0,
          ]
        );

        console.log(`✅ Synced product: ${normalizedData.name} from server`);
        return { success: true, id: productId, action: "created" };
      }
    } catch (error) {
      console.error("Error syncing product from server:", error);
      return { success: false, error: error.message };
    }
  },
};

// NEW: Product Attribute Service
export const ProductAttributeService = {
  // Save attribute
  saveAttribute: async (attributeData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(attributeData);
      const now = new Date().toISOString();

      // Check if user has access to the product's business
      const product = await ProductService.getProductById(normalizedData.product_id, userId);
      if (!product) {
        throw new Error("Product not found or access denied");
      }

      const attributeId = normalizedData.server_id || normalizedData.id || uuid.v4();
      
      // Check if attribute exists
      const existingAttribute = await db.getFirstAsync(
        "SELECT id FROM product_attributes WHERE server_id = ? OR (product_id = ? AND name = ?)",
        [
          normalizedData.server_id || normalizedData.id,
          ensureStringId(normalizedData.product_id),
          normalizedData.name,
        ]
      );

      if (existingAttribute) {
        // Update existing attribute
        await db.runAsync(
          `UPDATE product_attributes SET
            name = ?,
            display_order = ?,
            is_required = ?,
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.name,
            normalizedData.display_order || 0,
            normalizedData.is_required !== false ? 1 : 0,
            now,
            now,
            existingAttribute.id,
          ]
        );
        return { success: true, id: existingAttribute.id, action: "updated" };
      } else {
        // Insert new attribute
        await db.runAsync(
          `INSERT INTO product_attributes (
            id, server_id, product_id, name, display_order, is_required,
            created_at, updated_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            attributeId,
            normalizedData.server_id || normalizedData.id || null,
            ensureStringId(normalizedData.product_id),
            normalizedData.name,
            normalizedData.display_order || 0,
            normalizedData.is_required !== false ? 1 : 0,
            now,
            now,
            now,
            "synced",
            0,
          ]
        );
        return { success: true, id: attributeId, action: "created" };
      }
    } catch (error) {
      console.error("Error saving product attribute:", error);
      return { success: false, error: error.message };
    }
  },

  // Get attributes by product
  getAttributesByProduct: async (productId, userId) => {
    try {
      const db = await openDatabase();

      // Check if user has access to the product
      const product = await ProductService.getProductById(productId, userId);
      if (!product) {
        return [];
      }

      return await db.getAllAsync(
        `SELECT pa.*, 
           (SELECT GROUP_CONCAT(value, ', ') 
            FROM product_attribute_values pav 
            WHERE pav.attribute_id = pa.id) as values_list
         FROM product_attributes pa
         WHERE pa.product_id = ?
         ORDER BY pa.display_order, pa.name`,
        [ensureStringId(productId)]
      );
    } catch (error) {
      console.error("Error getting attributes by product:", error);
      return [];
    }
  },
};

// NEW: Product Attribute Value Service
export const ProductAttributeValueService = {
  // Save attribute value
  saveAttributeValue: async (valueData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(valueData);
      const now = new Date().toISOString();

      // Check if user has access to the attribute's product
      const attribute = await db.getFirstAsync(
        `SELECT pa.*, p.business_id FROM product_attributes pa
         JOIN products p ON pa.product_id = p.id
         WHERE pa.id = ?`,
        [ensureStringId(normalizedData.attribute_id)]
      );

      if (!attribute) {
        throw new Error("Attribute not found");
      }

      // Check access to business
      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, attribute.business_id);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(attribute.business_id);
        if (!business || business.owner_id !== userId) {
          throw new Error("Access denied");
        }
      }

      const valueId = normalizedData.server_id || normalizedData.id || uuid.v4();
      
      // Check if value exists
      const existingValue = await db.getFirstAsync(
        "SELECT id FROM product_attribute_values WHERE server_id = ? OR (attribute_id = ? AND value = ?)",
        [
          normalizedData.server_id || normalizedData.id,
          ensureStringId(normalizedData.attribute_id),
          normalizedData.value,
        ]
      );

      if (existingValue) {
        // Update existing value
        await db.runAsync(
          `UPDATE product_attribute_values SET
            value = ?,
            display_order = ?,
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.value,
            normalizedData.display_order || 0,
            now,
            now,
            existingValue.id,
          ]
        );
        return { success: true, id: existingValue.id, action: "updated" };
      } else {
        // Insert new value
        await db.runAsync(
          `INSERT INTO product_attribute_values (
            id, server_id, attribute_id, value, display_order,
            created_at, updated_at, synced_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            valueId,
            normalizedData.server_id || normalizedData.id || null,
            ensureStringId(normalizedData.attribute_id),
            normalizedData.value,
            normalizedData.display_order || 0,
            now,
            now,
            now,
            "synced",
            0,
          ]
        );
        return { success: true, id: valueId, action: "created" };
      }
    } catch (error) {
      console.error("Error saving attribute value:", error);
      return { success: false, error: error.message };
    }
  },
};

// NEW: Product Variant Service
export const ProductVariantService = {
  // Save variant
  saveVariant: async (variantData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(variantData);
      const now = new Date().toISOString();

      // Check if user has access to the product's business
      const product = await ProductService.getProductById(normalizedData.product_id, userId);
      if (!product) {
        throw new Error("Product not found or access denied");
      }

      const variantId = normalizedData.server_id || normalizedData.id || uuid.v4();
      
      // Check if variant exists
      const existingVariant = await db.getFirstAsync(
        "SELECT id FROM product_variants WHERE server_id = ? OR (product_id = ? AND (sku = ? OR barcode = ? OR name = ?))",
        [
          normalizedData.server_id || normalizedData.id,
          ensureStringId(normalizedData.product_id),
          normalizedData.sku,
          normalizedData.barcode,
          normalizedData.name,
        ]
      );

      if (existingVariant) {
        // Update existing variant
        await db.runAsync(
          `UPDATE product_variants SET
            name = ?,
            sku = ?,
            barcode = ?,
            cost_price = ?,
            selling_price = ?,
            wholesale_price = ?,
            weight = ?,
            dimensions = ?,
            image = ?,
            is_active = ?,
            is_default = ?,
            updated_at = ?,
            synced_at = ?,
            sync_status = 'synced',
            is_dirty = 0
          WHERE id = ?`,
          [
            normalizedData.name,
            normalizedData.sku,
            normalizedData.barcode,
            normalizedData.cost_price,
            normalizedData.selling_price,
            normalizedData.wholesale_price,
            normalizedData.weight,
            normalizedData.dimensions,
            normalizedData.image,
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.is_default ? 1 : 0,
            now,
            now,
            existingVariant.id,
          ]
        );
        return { success: true, id: existingVariant.id, action: "updated" };
      } else {
        // Insert new variant
        await db.runAsync(
          `INSERT INTO product_variants (
            id, server_id, product_id, name, sku, barcode, cost_price,
            selling_price, wholesale_price, weight, dimensions, image,
            is_active, is_default, created_at, updated_at, synced_at,
            sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            variantId,
            normalizedData.server_id || normalizedData.id || null,
            ensureStringId(normalizedData.product_id),
            normalizedData.name,
            normalizedData.sku,
            normalizedData.barcode,
            normalizedData.cost_price,
            normalizedData.selling_price,
            normalizedData.wholesale_price,
            normalizedData.weight,
            normalizedData.dimensions,
            normalizedData.image,
            normalizedData.is_active !== false ? 1 : 0,
            normalizedData.is_default ? 1 : 0,
            now,
            now,
            now,
            "synced",
            0,
          ]
        );
        return { success: true, id: variantId, action: "created" };
      }
    } catch (error) {
      console.error("Error saving product variant:", error);
      return { success: false, error: error.message };
    }
  },

  // Get variants by product
  getVariantsByProduct: async (productId, userId) => {
    try {
      const db = await openDatabase();

      // Check if user has access to the product
      const product = await ProductService.getProductById(productId, userId);
      if (!product) {
        return [];
      }

      return await db.getAllAsync(
        `SELECT v.*,
           (SELECT SUM(current_stock) FROM inventory i WHERE i.variant_id = v.id) as total_stock
         FROM product_variants v
         WHERE v.product_id = ? AND v.is_active = 1
         ORDER BY v.is_default DESC, v.name`,
        [ensureStringId(productId)]
      );
    } catch (error) {
      console.error("Error getting variants by product:", error);
      return [];
    }
  },
};

// NEW: StockMovement Service
export const StockMovementService = {
  // Create a stock movement record
  createMovement: async (movementData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(movementData);
      const movementId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      // Validate required fields
      if (!normalizedData.inventory_id) throw new Error("inventory_id is required");
      if (!normalizedData.shop_id) throw new Error("shop_id is required");
      if (!normalizedData.movement_type) throw new Error("movement_type is required");
      if (normalizedData.quantity === undefined) throw new Error("quantity is required");

      await db.runAsync(
        `INSERT INTO stock_movements (
          id, server_id, inventory_id, shop_id, product_id, variant_id,
          movement_type, quantity, reference, reason, performed_by,
          created_at, synced_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movementId,
          normalizedData.server_id || null,
          ensureStringId(normalizedData.inventory_id),
          ensureStringId(normalizedData.shop_id),
          normalizedData.product_id ? ensureStringId(normalizedData.product_id) : null,
          normalizedData.variant_id ? ensureStringId(normalizedData.variant_id) : null,
          normalizedData.movement_type,
          normalizedData.quantity,
          normalizedData.reference || null,
          normalizedData.reason || null,
          normalizedData.performed_by ? ensureStringId(normalizedData.performed_by) : null,
          normalizedData.created_at || now,
          now,
          "pending",
          1,
        ]
      );

      return { success: true, id: movementId };
    } catch (error) {
      console.error("Error creating stock movement:", error);
      return { success: false, error: error.message };
    }
  },

  // Get movements for an inventory record
  getMovementsByInventory: async (inventoryId, limit = 100) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT sm.*, u.username as performed_by_username
         FROM stock_movements sm
         LEFT JOIN users u ON sm.performed_by = u.id
         WHERE sm.inventory_id = ?
         ORDER BY sm.created_at DESC
         LIMIT ?`,
        [ensureStringId(inventoryId), limit]
      );
    } catch (error) {
      console.error("Error getting stock movements by inventory:", error);
      return [];
    }
  },

  // Get movements for a shop
  getMovementsByShop: async (shopId, limit = 100) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT sm.*, u.username as performed_by_username,
                COALESCE(p.name, v.name) as item_name
         FROM stock_movements sm
         LEFT JOIN users u ON sm.performed_by = u.id
         LEFT JOIN products p ON sm.product_id = p.id
         LEFT JOIN product_variants v ON sm.variant_id = v.id
         WHERE sm.shop_id = ?
         ORDER BY sm.created_at DESC
         LIMIT ?`,
        [ensureStringId(shopId), limit]
      );
    } catch (error) {
      console.error("Error getting stock movements by shop:", error);
      return [];
    }
  },

  // Get pending sync movements
  getPendingSyncMovements: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM stock_movements WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync movements:", error);
      return [];
    }
  },

  // Mark movement as synced
  markAsSynced: async (localId, serverId) => {
    return BaseService.markAsSynced('stock_movements', localId, serverId);
  },
};

// UPDATED: Inventory Service (with stock movement integration)
export const InventoryService = {
  // Update inventory (or create if not exists) - now updates last_movement
  updateInventory: async (inventoryData, userId) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(inventoryData);
      const now = new Date().toISOString();

      // Validate: must have either product_id or variant_id, but not both
      if (!normalizedData.product_id && !normalizedData.variant_id) {
        throw new Error("Either product_id or variant_id is required");
      }
      if (normalizedData.product_id && normalizedData.variant_id) {
        throw new Error("Cannot have both product_id and variant_id");
      }

      // Check access to shop's business
      const shop = await ShopService.getShopById(normalizedData.shop_id);
      if (!shop) {
        throw new Error("Shop not found");
      }

      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, shop.business_id);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(shop.business_id);
        if (!business || business.owner_id !== userId) {
          throw new Error("Access denied to shop's business");
        }
      }

      // Check if inventory already exists
      let existing = null;
      if (normalizedData.product_id) {
        existing = await db.getFirstAsync(
          "SELECT id FROM inventory WHERE product_id = ? AND shop_id = ?",
          [
            ensureStringId(normalizedData.product_id),
            ensureStringId(normalizedData.shop_id),
          ]
        );
      } else {
        existing = await db.getFirstAsync(
          "SELECT id FROM inventory WHERE variant_id = ? AND shop_id = ?",
          [
            ensureStringId(normalizedData.variant_id),
            ensureStringId(normalizedData.shop_id),
          ]
        );
      }

      if (existing) {
        // Update existing inventory
        await db.runAsync(
          `UPDATE inventory SET 
            current_stock = ?,
            reserved_stock = ?,
            minimum_stock = ?,
            maximum_stock = ?,
            last_restocked = ?,
            last_movement = ?,
            is_locked = ?,
            updated_at = ?,
            sync_status = 'pending',
            is_dirty = 1
          WHERE id = ?`,
          [
            normalizedData.current_stock !== undefined ? normalizedData.current_stock : null,
            normalizedData.reserved_stock !== undefined ? normalizedData.reserved_stock : null,
            normalizedData.minimum_stock !== undefined ? normalizedData.minimum_stock : null,
            normalizedData.maximum_stock !== undefined ? normalizedData.maximum_stock : null,
            normalizedData.last_restocked || now,
            normalizedData.last_movement || now,
            normalizedData.is_locked !== undefined ? (normalizedData.is_locked ? 1 : 0) : 0,
            now,
            existing.id,
          ]
        );
        return { success: true, id: existing.id, action: "updated" };
      } else {
        // Create new inventory
        const inventoryId = uuid.v4();

        await db.runAsync(
          `INSERT INTO inventory (
            id, server_id, product_id, variant_id, shop_id, current_stock, reserved_stock,
            minimum_stock, maximum_stock, last_restocked, last_movement, is_locked, is_active,
            created_at, updated_at, sync_status, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inventoryId,
            normalizedData.server_id || null,
            normalizedData.product_id ? ensureStringId(normalizedData.product_id) : null,
            normalizedData.variant_id ? ensureStringId(normalizedData.variant_id) : null,
            ensureStringId(normalizedData.shop_id),
            normalizedData.current_stock !== undefined ? normalizedData.current_stock : 0,
            normalizedData.reserved_stock !== undefined ? normalizedData.reserved_stock : 0,
            normalizedData.minimum_stock !== undefined ? normalizedData.minimum_stock : 0,
            normalizedData.maximum_stock !== undefined ? normalizedData.maximum_stock : null,
            normalizedData.last_restocked || now,
            normalizedData.last_movement || now,
            normalizedData.is_locked !== undefined ? (normalizedData.is_locked ? 1 : 0) : 0,
            1,
            now,
            now,
            "pending",
            1,
          ]
        );
        return { success: true, id: inventoryId, action: "created" };
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      return { success: false, error: error.message };
    }
  },

  // Stock in (restock)
  stockIn: async (inventoryId, quantity, userId, reason = null, reference = null) => {
    const db = await openDatabase();
    const now = new Date().toISOString();

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    // Get inventory record with lock
    const inventory = await db.getFirstAsync(
      "SELECT * FROM inventory WHERE id = ? FOR UPDATE",
      [ensureStringId(inventoryId)]
    );
    if (!inventory) throw new Error("Inventory not found");
    if (inventory.is_locked) throw new Error("Inventory is locked");

    const newStock = inventory.current_stock + quantity;

    // Update inventory
    await db.runAsync(
      `UPDATE inventory SET
        current_stock = ?,
        last_restocked = ?,
        last_movement = ?,
        updated_at = ?,
        sync_status = 'pending',
        is_dirty = 1
      WHERE id = ?`,
      [newStock, now, now, now, inventoryId]
    );

    // Create movement record
    const movementResult = await StockMovementService.createMovement({
      inventory_id: inventoryId,
      shop_id: inventory.shop_id,
      product_id: inventory.product_id,
      variant_id: inventory.variant_id,
      movement_type: 'in',
      quantity: quantity,
      reason: reason,
      reference: reference,
      performed_by: userId,
    });

    if (!movementResult.success) {
      throw new Error(movementResult.error);
    }

    return { success: true, newStock };
  },

  // Stock out (loss/damage)
  stockOut: async (inventoryId, quantity, userId, reason = null) => {
    const db = await openDatabase();
    const now = new Date().toISOString();

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    // Get inventory with lock
    const inventory = await db.getFirstAsync(
      "SELECT * FROM inventory WHERE id = ? FOR UPDATE",
      [ensureStringId(inventoryId)]
    );
    if (!inventory) throw new Error("Inventory not found");
    if (inventory.is_locked) throw new Error("Inventory is locked");

    const available = inventory.current_stock - inventory.reserved_stock;
    if (available < quantity) {
      throw new Error(`Insufficient stock. Available: ${available}`);
    }

    const newStock = inventory.current_stock - quantity;

    // Update inventory
    await db.runAsync(
      `UPDATE inventory SET
        current_stock = ?,
        last_movement = ?,
        updated_at = ?,
        sync_status = 'pending',
        is_dirty = 1
      WHERE id = ?`,
      [newStock, now, now, inventoryId]
    );

    // Create movement record
    const movementResult = await StockMovementService.createMovement({
      inventory_id: inventoryId,
      shop_id: inventory.shop_id,
      product_id: inventory.product_id,
      variant_id: inventory.variant_id,
      movement_type: 'out',
      quantity: -quantity,
      reason: reason,
      performed_by: userId,
    });

    if (!movementResult.success) {
      throw new Error(movementResult.error);
    }

    return { success: true, newStock };
  },

  // Adjust stock (set to new quantity)
  adjustStock: async (inventoryId, newQuantity, userId, reason = null) => {
    const db = await openDatabase();
    const now = new Date().toISOString();

    // Get inventory with lock
    const inventory = await db.getFirstAsync(
      "SELECT * FROM inventory WHERE id = ? FOR UPDATE",
      [ensureStringId(inventoryId)]
    );
    if (!inventory) throw new Error("Inventory not found");
    if (inventory.is_locked) throw new Error("Inventory is locked");

    const difference = newQuantity - inventory.current_stock;

    // Update inventory
    await db.runAsync(
      `UPDATE inventory SET
        current_stock = ?,
        last_movement = ?,
        updated_at = ?,
        sync_status = 'pending',
        is_dirty = 1
      WHERE id = ?`,
      [newQuantity, now, now, inventoryId]
    );

    // Create movement record
    const movementResult = await StockMovementService.createMovement({
      inventory_id: inventoryId,
      shop_id: inventory.shop_id,
      product_id: inventory.product_id,
      variant_id: inventory.variant_id,
      movement_type: 'adjustment',
      quantity: difference,
      reason: reason,
      performed_by: userId,
    });

    if (!movementResult.success) {
      throw new Error(movementResult.error);
    }

    return { success: true, newStock: newQuantity, difference };
  },

  // Deduct for sale (called during sale creation)
  deductForSale: async (inventoryId, quantity, saleId, userId) => {
    const db = await openDatabase();
    const now = new Date().toISOString();

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    // Get inventory with lock
    const inventory = await db.getFirstAsync(
      "SELECT * FROM inventory WHERE id = ? FOR UPDATE",
      [ensureStringId(inventoryId)]
    );
    if (!inventory) throw new Error("Inventory not found");
    if (inventory.is_locked) throw new Error("Inventory is locked");

    const available = inventory.current_stock - inventory.reserved_stock;
    if (available < quantity) {
      throw new Error(`Insufficient stock. Available: ${available}`);
    }

    const newStock = inventory.current_stock - quantity;

    // Update inventory
    await db.runAsync(
      `UPDATE inventory SET
        current_stock = ?,
        last_movement = ?,
        updated_at = ?,
        sync_status = 'pending',
        is_dirty = 1
      WHERE id = ?`,
      [newStock, now, now, inventoryId]
    );

    // Create movement record
    const movementResult = await StockMovementService.createMovement({
      inventory_id: inventoryId,
      shop_id: inventory.shop_id,
      product_id: inventory.product_id,
      variant_id: inventory.variant_id,
      movement_type: 'sale',
      quantity: -quantity,
      reference: saleId,
      performed_by: userId,
    });

    if (!movementResult.success) {
      throw new Error(movementResult.error);
    }

    return { success: true, newStock };
  },

  // Return stock (customer return)
  returnStock: async (inventoryId, quantity, saleId, userId, reason = null) => {
    const db = await openDatabase();
    const now = new Date().toISOString();

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    // Get inventory with lock
    const inventory = await db.getFirstAsync(
      "SELECT * FROM inventory WHERE id = ? FOR UPDATE",
      [ensureStringId(inventoryId)]
    );
    if (!inventory) throw new Error("Inventory not found");
    if (inventory.is_locked) throw new Error("Inventory is locked");

    const newStock = inventory.current_stock + quantity;

    // Update inventory
    await db.runAsync(
      `UPDATE inventory SET
        current_stock = ?,
        last_movement = ?,
        updated_at = ?,
        sync_status = 'pending',
        is_dirty = 1
      WHERE id = ?`,
      [newStock, now, now, inventoryId]
    );

    // Create movement record
    const movementResult = await StockMovementService.createMovement({
      inventory_id: inventoryId,
      shop_id: inventory.shop_id,
      product_id: inventory.product_id,
      variant_id: inventory.variant_id,
      movement_type: 'return',
      quantity: quantity,
      reference: saleId,
      reason: reason,
      performed_by: userId,
    });

    if (!movementResult.success) {
      throw new Error(movementResult.error);
    }

    return { success: true, newStock };
  },

  // Lock inventory (prevent updates)
  lockInventory: async (inventoryId) => {
    const db = await openDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE inventory SET is_locked = 1, updated_at = ? WHERE id = ?`,
      [now, ensureStringId(inventoryId)]
    );
    return { success: true };
  },

  // Unlock inventory
  unlockInventory: async (inventoryId) => {
    const db = await openDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE inventory SET is_locked = 0, updated_at = ? WHERE id = ?`,
      [now, ensureStringId(inventoryId)]
    );
    return { success: true };
  },

  // Get inventory by shop (unchanged from original, but we'll keep)
  getInventoryByShop: async (shopId, userId) => {
    try {
      const db = await openDatabase();

      // Check access to shop's business
      const shop = await ShopService.getShopById(shopId);
      if (!shop) {
        return [];
      }

      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, shop.business_id);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(shop.business_id);
        if (!business || business.owner_id !== userId) {
          return [];
        }
      }

      return await db.getAllAsync(
        `SELECT i.*, 
                COALESCE(p.name, v.name) as item_name,
                COALESCE(p.base_sku, v.sku) as sku,
                COALESCE(p.base_barcode, v.barcode) as barcode,
                COALESCE(p.base_selling_price, v.selling_price) as selling_price,
                CASE 
                  WHEN i.product_id IS NOT NULL THEN 'product'
                  ELSE 'variant'
                END as item_type
         FROM inventory i
         LEFT JOIN products p ON i.product_id = p.id
         LEFT JOIN product_variants v ON i.variant_id = v.id
         WHERE i.shop_id = ? AND i.is_active = 1
         ORDER BY item_name`,
        [ensureStringId(shopId)]
      );
    } catch (error) {
      console.error("Error getting inventory by shop:", error);
      return [];
    }
  },

  // Get low stock items for shop
  getLowStockItems: async (shopId, userId) => {
    try {
      const db = await openDatabase();

      // Check access to shop's business
      const shop = await ShopService.getShopById(shopId);
      if (!shop) {
        return [];
      }

      const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, shop.business_id);
      if (!hasAccess) {
        const business = await BusinessService.getBusinessById(shop.business_id);
        if (!business || business.owner_id !== userId) {
          return [];
        }
      }

      return await db.getAllAsync(
        `SELECT i.*, 
                COALESCE(p.name, v.name) as item_name,
                COALESCE(p.base_sku, v.sku) as sku,
                COALESCE(p.base_selling_price, v.selling_price) as selling_price,
                COALESCE(p.reorder_level, 10) as reorder_level
         FROM inventory i
         LEFT JOIN products p ON i.product_id = p.id
         LEFT JOIN product_variants v ON i.variant_id = v.id
         WHERE i.shop_id = ? AND i.is_active = 1
         AND i.current_stock <= i.minimum_stock
         ORDER BY i.current_stock ASC`,
        [ensureStringId(shopId)]
      );
    } catch (error) {
      console.error("Error getting low stock items:", error);
      return [];
    }
  },
};

// NEW: Price History Service
export const PriceHistoryService = {
  // Create price history entry
  createPriceHistory: async (historyData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(historyData);
      const historyId = normalizedData.id || uuid.v4();
      const now = new Date().toISOString();

      // Validate: must have either product_id or variant_id
      if (!normalizedData.product_id && !normalizedData.variant_id) {
        throw new Error("Either product_id or variant_id is required");
      }

      await db.runAsync(
        `INSERT INTO price_history (
          id, server_id, product_id, variant_id, old_price, new_price,
          price_type, change_reason, changed_by, changed_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId,
          normalizedData.server_id || null,
          normalizedData.product_id ? ensureStringId(normalizedData.product_id) : null,
          normalizedData.variant_id ? ensureStringId(normalizedData.variant_id) : null,
          normalizedData.old_price || 0.0,
          normalizedData.new_price || 0.0,
          normalizedData.price_type || 'selling',
          normalizedData.change_reason || '',
          normalizedData.changed_by ? ensureStringId(normalizedData.changed_by) : null,
          normalizedData.changed_at || now,
          'pending',
          1,
        ]
      );

      return { success: true, id: historyId };
    } catch (error) {
      console.error("Error creating price history:", error);
      return { success: false, error: error.message };
    }
  },

  // Get price history by product or variant
  getPriceHistory: async (itemId, itemType = 'product', userId) => {
    try {
      const db = await openDatabase();

      // Determine which table to check based on itemType
      let businessId = null;
      if (itemType === 'product') {
        const product = await ProductService.getProductById(itemId, userId);
        if (!product) return [];
        businessId = product.business_id;
      } else {
        // For variant, get through product
        const variant = await db.getFirstAsync(
          `SELECT v.*, p.business_id 
           FROM product_variants v
           JOIN products p ON v.product_id = p.id
           WHERE v.id = ?`,
          [ensureStringId(itemId)]
        );
        if (!variant) return [];
        
        // Check access to business
        const hasAccess = await EmployeeService.checkUserBusinessAccess(userId, variant.business_id);
        if (!hasAccess) {
          const business = await BusinessService.getBusinessById(variant.business_id);
          if (!business || business.owner_id !== userId) {
            return [];
          }
        }
        businessId = variant.business_id;
      }

      let whereClause = "";
      let params = [];
      
      if (itemType === 'product') {
        whereClause = "ph.product_id = ?";
        params = [ensureStringId(itemId)];
      } else {
        whereClause = "ph.variant_id = ?";
        params = [ensureStringId(itemId)];
      }

      return await db.getAllAsync(
        `SELECT ph.*, u.username as changed_by_username
         FROM price_history ph
         LEFT JOIN users u ON ph.changed_by = u.id
         WHERE ${whereClause}
         ORDER BY ph.changed_at DESC
         LIMIT 50`,
        params
      );
    } catch (error) {
      console.error("Error getting price history:", error);
      return [];
    }
  },
};

// Customer Service
export const CustomerService = {
  // Create customer
  createCustomer: async (customerData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(customerData);
      const customerId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO customers (
          id, business_id, name, phone_number, email, address,
          loyalty_points, total_spent, preferences, created_at,
          updated_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          ensureStringId(normalizedData.business_id),
          normalizedData.name || "",
          normalizedData.phone_number || "",
          normalizedData.email || "",
          normalizedData.address || "",
          normalizedData.loyalty_points || 0,
          normalizedData.total_spent || 0.0,
          normalizedData.preferences
            ? JSON.stringify(normalizedData.preferences)
            : "{}",
          now,
          now,
          "pending",
          1,
        ]
      );

      return { success: true, id: customerId };
    } catch (error) {
      console.error("Error creating customer:", error);
      return { success: false, error: error.message };
    }
  },

  // Get customers by business
  getCustomersByBusiness: async (businessId) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM customers WHERE business_id = ? AND is_active = 1 ORDER BY name",
        [ensureStringId(businessId)]
      );
    } catch (error) {
      console.error("Error getting customers by business:", error);
      return [];
    }
  },

  // Search customers
  searchCustomers: async (businessId, query) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT * FROM customers 
         WHERE business_id = ? AND is_active = 1
         AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ?)
         ORDER BY name`,
        [ensureStringId(businessId), `%${query}%`, `%${query}%`, `%${query}%`]
      );
    } catch (error) {
      console.error("Error searching customers:", error);
      return [];
    }
  },

  // Get customer by ID
  getCustomerById: async (customerId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync("SELECT * FROM customers WHERE id = ?", [
        ensureStringId(customerId),
      ]);
    } catch (error) {
      console.error("Error getting customer by ID:", error);
      return null;
    }
  },

  // Update customer
  updateCustomer: async (customerId, updates) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const customerIdStr = ensureStringId(customerId);

      const fields = Object.keys(updates);
      const values = fields.map((field) => {
        if (field === "preferences" && typeof updates[field] === "object") {
          return JSON.stringify(updates[field]);
        }
        return updates[field];
      });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(
        `UPDATE customers SET ${setClause}, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [...values, now, customerIdStr]
      );

      return { success: true };
    } catch (error) {
      console.error("Error updating customer:", error);
      return { success: false, error: error.message };
    }
  },

  // Get pending sync customers
  getPendingSyncCustomers: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM customers WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync customers:", error);
      return [];
    }
  },
};

// Sale Service
export const SaleService = {
  // Create sale
  createSale: async (saleData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(saleData);
      const saleId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      // Generate receipt number
      const receiptNumber = `RCPT-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

      await db.runAsync(
        `INSERT INTO sales (
          id, shop_id, attendant_id, customer_id, subtotal,
          tax_amount, discount_amount, total_amount, amount_paid,
          change_given, status, receipt_number, sale_date,
          created_at, updated_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          ensureStringId(normalizedData.shop_id),
          ensureStringId(normalizedData.attendant_id),
          normalizedData.customer_id
            ? ensureStringId(normalizedData.customer_id)
            : null,
          normalizedData.subtotal || 0.0,
          normalizedData.tax_amount || 0.0,
          normalizedData.discount_amount || 0.0,
          normalizedData.total_amount || 0.0,
          normalizedData.amount_paid || 0.0,
          normalizedData.change_given || 0.0,
          normalizedData.status || "draft",
          receiptNumber,
          normalizedData.sale_date || now,
          now,
          now,
          "pending",
          1,
        ]
      );

      return { success: true, id: saleId, receipt_number: receiptNumber };
    } catch (error) {
      console.error("Error creating sale:", error);
      return { success: false, error: error.message };
    }
  },

  // Get sales by shop
  getSalesByShop: async (shopId, limit = 50) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        `SELECT s.*, c.name as customer_name
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.id
         WHERE s.shop_id = ?
         ORDER BY s.sale_date DESC
         LIMIT ?`,
        [ensureStringId(shopId), limit]
      );
    } catch (error) {
      console.error("Error getting sales by shop:", error);
      return [];
    }
  },

  // Get sale by ID
  getSaleById: async (saleId) => {
    try {
      const db = await openDatabase();
      return await db.getFirstAsync("SELECT * FROM sales WHERE id = ?", [
        ensureStringId(saleId),
      ]);
    } catch (error) {
      console.error("Error getting sale by ID:", error);
      return null;
    }
  },

  // Complete sale
  completeSale: async (saleId) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();

      await db.runAsync(
        `UPDATE sales SET 
          status = 'completed',
          completed_at = ?,
          updated_at = ?,
          sync_status = 'pending',
          is_dirty = 1
        WHERE id = ?`,
        [now, now, ensureStringId(saleId)]
      );

      return { success: true };
    } catch (error) {
      console.error("Error completing sale:", error);
      return { success: false, error: error.message };
    }
  },

  // Get daily sales summary
  getDailySalesSummary: async (shopId, date) => {
    try {
      const db = await openDatabase();
      const targetDate = date || new Date().toISOString().split("T")[0];

      return await db.getFirstAsync(
        `SELECT 
           COUNT(*) as total_sales,
           SUM(total_amount) as total_revenue,
           SUM(tax_amount) as total_tax,
           SUM(discount_amount) as total_discount
         FROM sales 
         WHERE shop_id = ? 
         AND DATE(sale_date) = ?
         AND status = 'completed'`,
        [ensureStringId(shopId), targetDate]
      );
    } catch (error) {
      console.error("Error getting daily sales summary:", error);
      return null;
    }
  },

  // Get pending sync sales
  getPendingSyncSales: async () => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        'SELECT * FROM sales WHERE is_dirty = 1 OR sync_status = "pending"'
      );
    } catch (error) {
      console.error("Error getting pending sync sales:", error);
      return [];
    }
  },
};

// Payment Service
export const PaymentService = {
  // Create payment
  createPayment: async (paymentData) => {
    try {
      const db = await openDatabase();
      const normalizedData = normalizeIds(paymentData);
      const paymentId = normalizedData.id || nanoid();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO payments (
          id, sale_id, method, amount, status,
          transaction_id, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          ensureStringId(normalizedData.sale_id),
          normalizedData.method || "cash",
          normalizedData.amount || 0.0,
          normalizedData.status || "completed",
          normalizedData.transaction_id || null,
          normalizedData.paid_at || now,
        ]
      );

      return { success: true, id: paymentId };
    } catch (error) {
      console.error("Error creating payment:", error);
      return { success: false, error: error.message };
    }
  },

  // Get payments by sale
  getPaymentsBySale: async (saleId) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM payments WHERE sale_id = ? ORDER BY paid_at DESC",
        [ensureStringId(saleId)]
      );
    } catch (error) {
      console.error("Error getting payments by sale:", error);
      return [];
    }
  },
};

// Sync Log Service
export const SyncLogService = {
  // Create sync log
  createSyncLog: async (logData) => {
    try {
      const db = await openDatabase();
      const logId = nanoid();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO sync_logs (
          id, operation, entity_type, status, data_count,
          start_time, end_time, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          logData.operation || "sync",
          logData.entity_type || "unknown",
          logData.status || "pending",
          logData.data_count || 0,
          logData.start_time || now,
          logData.end_time || null,
          logData.error_message || null,
          now,
        ]
      );

      return { success: true, id: logId };
    } catch (error) {
      console.error("Error creating sync log:", error);
      return { success: false, error: error.message };
    }
  },

  // Update sync log
  updateSyncLog: async (logId, updates) => {
    try {
      const db = await openDatabase();
      const logIdStr = ensureStringId(logId);

      const fields = Object.keys(updates);
      const values = fields.map((field) => updates[field]);
      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      await db.runAsync(`UPDATE sync_logs SET ${setClause} WHERE id = ?`, [
        ...values,
        logIdStr,
      ]);

      return { success: true };
    } catch (error) {
      console.error("Error updating sync log:", error);
      return { success: false, error: error.message };
    }
  },

  // Get recent sync logs
  getRecentLogs: async (limit = 20) => {
    try {
      const db = await openDatabase();
      return await db.getAllAsync(
        "SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ?",
        [limit]
      );
    } catch (error) {
      console.error("Error getting recent sync logs:", error);
      return [];
    }
  },
};

// Settings Service
export const SettingsService = {
  // Get user setting
  getUserSetting: async (userId, key) => {
    try {
      const db = await openDatabase();
      const setting = await db.getFirstAsync(
        "SELECT * FROM app_settings WHERE user_id = ? AND key = ?",
        [ensureStringId(userId), key]
      );
      return setting ? setting.value : null;
    } catch (error) {
      console.error("Error getting user setting:", error);
      return null;
    }
  },

  // Set user setting
  setUserSetting: async (userId, key, value) => {
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const settingId = nanoid();

      // Check if setting exists
      const existing = await db.getFirstAsync(
        "SELECT id FROM app_settings WHERE user_id = ? AND key = ?",
        [ensureStringId(userId), key]
      );

      if (existing) {
        await db.runAsync(
          "UPDATE app_settings SET value = ?, updated_at = ? WHERE user_id = ? AND key = ?",
          [value, now, ensureStringId(userId), key]
        );
      } else {
        await db.runAsync(
          "INSERT INTO app_settings (id, user_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [settingId, ensureStringId(userId), key, value, now, now]
        );
      }

      return true;
    } catch (error) {
      console.error("Error setting user setting:", error);
      return false;
    }
  },

  // Get all user settings
  getAllUserSettings: async (userId) => {
    try {
      const db = await openDatabase();
      const settings = await db.getAllAsync(
        "SELECT * FROM app_settings WHERE user_id = ?",
        [ensureStringId(userId)]
      );

      // Convert to object
      return settings.reduce((obj, setting) => {
        obj[setting.key] = setting.value;
        return obj;
      }, {});
    } catch (error) {
      console.error("Error getting all user settings:", error);
      return {};
    }
  },
};

// Add this function to database/index.js
export const cleanupDuplicateEmployees = async () => {
  try {
    const db = await openDatabase();
    console.log('🧹 Cleaning duplicate employees...');
    
    // Step 1: Find and fix employees without local ID
    const nullIdEmployees = await db.getAllAsync(
      'SELECT ROWID as sqlite_rowid, * FROM employees WHERE id IS NULL OR id = ""'
    );
    
    console.log(`Found ${nullIdEmployees.length} employees without local ID`);
    
    for (const employee of nullIdEmployees) {
      const newId = nanoid();
      await db.runAsync(
        'UPDATE employees SET id = ? WHERE ROWID = ?',
        [newId, employee.sqlite_rowid]
      );
      console.log(`✅ Assigned ID ${newId} to employee ${employee.email}`);
    }
    
    // Step 2: Find duplicate employees by server_id
    const serverIdDuplicates = await db.getAllAsync(`
      SELECT server_id, COUNT(*) as count
      FROM employees 
      WHERE server_id IS NOT NULL AND server_id != ''
      GROUP BY server_id 
      HAVING count > 1
    `);
    
    console.log(`Found ${serverIdDuplicates.length} duplicate employee groups by server_id`);
    
    for (const dup of serverIdDuplicates) {
      if (!dup.server_id) continue;
      
      // Get all duplicates for this server_id, ordered by updated_at (keep newest)
      const duplicates = await db.getAllAsync(`
        SELECT ROWID as sqlite_rowid, id, server_id, email, updated_at
        FROM employees 
        WHERE server_id = ?
        ORDER BY updated_at DESC
      `, [dup.server_id]);
      
      // Keep first (most recent), delete rest
      if (duplicates.length > 1) {
        const keepId = duplicates[0].id;
        console.log(`🔄 Keeping employee ${keepId} (most recent)`);
        
        for (let i = 1; i < duplicates.length; i++) {
          await db.runAsync('DELETE FROM employees WHERE ROWID = ?', [duplicates[i].sqlite_rowid]);
          console.log(`🗑️ Deleted duplicate employee ROWID: ${duplicates[i].sqlite_rowid}, email: ${duplicates[i].email}`);
        }
      }
    }
    
    // Step 3: Find duplicate employees by email and business_id
    const emailDuplicates = await db.getAllAsync(`
      SELECT email, business_id, COUNT(*) as count
      FROM employees 
      WHERE email IS NOT NULL AND email != '' AND business_id IS NOT NULL
      GROUP BY email, business_id 
      HAVING count > 1
    `);
    
    console.log(`Found ${emailDuplicates.length} duplicate employee groups by email+business`);
    
    for (const dup of emailDuplicates) {
      if (!dup.email || !dup.business_id) continue;
      
      // Get all duplicates for this email+business, ordered by updated_at (keep newest)
      const duplicates = await db.getAllAsync(`
        SELECT ROWID as sqlite_rowid, id, email, business_id, updated_at
        FROM employees 
        WHERE email = ? AND business_id = ?
        ORDER BY updated_at DESC
      `, [dup.email, dup.business_id]);
      
      // Keep first (most recent), delete rest
      if (duplicates.length > 1) {
        const keepId = duplicates[0].id;
        console.log(`🔄 Keeping employee ${keepId} for ${dup.email} (most recent)`);
        
        for (let i = 1; i < duplicates.length; i++) {
          await db.runAsync('DELETE FROM employees WHERE ROWID = ?', [duplicates[i].sqlite_rowid]);
          console.log(`🗑️ Deleted duplicate employee ROWID: ${duplicates[i].sqlite_rowid}, email: ${duplicates[i].email}`);
        }
      }
    }
    
    // Step 4: Clean up any remaining duplicates
    const remainingDuplicates = await db.getAllAsync(`
      SELECT user_id, business_id, COUNT(*) as count
      FROM employees 
      WHERE user_id IS NOT NULL AND business_id IS NOT NULL
      GROUP BY user_id, business_id 
      HAVING count > 1
    `);
    
    console.log(`Found ${remainingDuplicates.length} remaining duplicate employee groups`);
    
    for (const dup of remainingDuplicates) {
      if (!dup.user_id || !dup.business_id) continue;
      
      const duplicates = await db.getAllAsync(`
        SELECT ROWID as sqlite_rowid, id, user_id, business_id, updated_at
        FROM employees 
        WHERE user_id = ? AND business_id = ?
        ORDER BY updated_at DESC
      `, [dup.user_id, dup.business_id]);
      
      if (duplicates.length > 1) {
        for (let i = 1; i < duplicates.length; i++) {
          await db.runAsync('DELETE FROM employees WHERE ROWID = ?', [duplicates[i].sqlite_rowid]);
          console.log(`🗑️ Deleted duplicate employee ROWID: ${duplicates[i].sqlite_rowid}`);
        }
      }
    }
    
    // Step 5: Add UNIQUE constraints if they don't exist
    try {
      const indexes = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'index'");
      const indexNames = indexes.map(idx => idx.name);
      
      if (!indexNames.includes('idx_employees_server_id')) {
        await db.execAsync(`
          CREATE UNIQUE INDEX idx_employees_server_id 
          ON employees(server_id) 
          WHERE server_id IS NOT NULL AND server_id != ''
        `);
        console.log('✅ Created unique index on server_id');
      }
      
      if (!indexNames.includes('idx_employees_user_business')) {
        await db.execAsync(`
          CREATE UNIQUE INDEX idx_employees_user_business 
          ON employees(user_id, business_id) 
          WHERE user_id IS NOT NULL AND business_id IS NOT NULL
        `);
        console.log('✅ Created unique index on user_id+business_id');
      }
      
      if (!indexNames.includes('idx_employees_email_business')) {
        await db.execAsync(`
          CREATE UNIQUE INDEX idx_employees_email_business 
          ON employees(email, business_id) 
          WHERE email IS NOT NULL AND email != '' AND business_id IS NOT NULL
        `);
        console.log('✅ Created unique index on email+business_id');
      }
      
    } catch (constraintError) {
      console.log('ℹ️ Constraints already exist or cannot be created:', constraintError.message);
    }
    
    // Get final count
    const finalCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM employees');
    
    return { 
      success: true, 
      nullIdsFixed: nullIdEmployees.length,
      duplicatesCleaned: serverIdDuplicates.length + emailDuplicates.length + remainingDuplicates.length,
      finalEmployeeCount: finalCount?.count || 0
    };
  } catch (error) {
    console.error('❌ Error cleaning duplicate employees:', error);
    return { success: false, error: error.message };
  }
};

// Add to database/index.js, after existing cleanupDuplicateEmployees

export const cleanupDuplicateEmployeesInTransaction = async (transaction) => {
  try {
    console.log('🧹 Cleaning duplicate employees (within transaction)...');
    
    // Step 1: Find and fix employees without local ID
    const nullIdEmployees = await transaction.getAllAsync(
      'SELECT ROWID as sqlite_rowid, * FROM employees WHERE id IS NULL OR id = ""'
    );
    
    for (const employee of nullIdEmployees) {
      const newId = nanoid();
      await transaction.runAsync(
        'UPDATE employees SET id = ? WHERE ROWID = ?',
        [newId, employee.sqlite_rowid]
      );
      console.log(`✅ Assigned ID ${newId} to employee ${employee.email}`);
    }
    
    // Step 2: Find duplicate employees by server_id
    const serverIdDuplicates = await transaction.getAllAsync(`
      SELECT server_id, COUNT(*) as count
      FROM employees 
      WHERE server_id IS NOT NULL AND server_id != ''
      GROUP BY server_id 
      HAVING count > 1
    `);
    
    for (const dup of serverIdDuplicates) {
      if (!dup.server_id) continue;
      const duplicates = await transaction.getAllAsync(`
        SELECT ROWID as sqlite_rowid, id, server_id, email, updated_at
        FROM employees 
        WHERE server_id = ?
        ORDER BY updated_at DESC
      `, [dup.server_id]);
      
      if (duplicates.length > 1) {
        for (let i = 1; i < duplicates.length; i++) {
          await transaction.runAsync('DELETE FROM employees WHERE ROWID = ?', [duplicates[i].sqlite_rowid]);
        }
      }
    }
    
    // Step 3: Find duplicate employees by email and business_id
    const emailDuplicates = await transaction.getAllAsync(`
      SELECT email, business_id, COUNT(*) as count
      FROM employees 
      WHERE email IS NOT NULL AND email != '' AND business_id IS NOT NULL
      GROUP BY email, business_id 
      HAVING count > 1
    `);
    
    for (const dup of emailDuplicates) {
      if (!dup.email || !dup.business_id) continue;
      const duplicates = await transaction.getAllAsync(`
        SELECT ROWID as sqlite_rowid, id, email, business_id, updated_at
        FROM employees 
        WHERE email = ? AND business_id = ?
        ORDER BY updated_at DESC
      `, [dup.email, dup.business_id]);
      
      if (duplicates.length > 1) {
        for (let i = 1; i < duplicates.length; i++) {
          await transaction.runAsync('DELETE FROM employees WHERE ROWID = ?', [duplicates[i].sqlite_rowid]);
        }
      }
    }
    
    // Step 4: Add unique indexes (if missing)
    const indexes = await transaction.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'index'");
    const indexNames = indexes.map(idx => idx.name);
    
    if (!indexNames.includes('idx_employees_server_id')) {
      await transaction.execAsync(`
        CREATE UNIQUE INDEX idx_employees_server_id 
        ON employees(server_id) 
        WHERE server_id IS NOT NULL AND server_id != ''
      `);
    }
    if (!indexNames.includes('idx_employees_user_business')) {
      await transaction.execAsync(`
        CREATE UNIQUE INDEX idx_employees_user_business 
        ON employees(user_id, business_id) 
        WHERE user_id IS NOT NULL AND business_id IS NOT NULL
      `);
    }
    if (!indexNames.includes('idx_employees_email_business')) {
      await transaction.execAsync(`
        CREATE UNIQUE INDEX idx_employees_email_business 
        ON employees(email, business_id) 
        WHERE email IS NOT NULL AND email != '' AND business_id IS NOT NULL
      `);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error cleaning duplicate employees in transaction:', error);
    throw error;
  }
};

// Export all services
export default {
  initDatabase,
  openDatabase,
  migrateDatabase,
  // Core services
  UserService,
  UserProfileService,
  BusinessService,
  ShopService,
  RoleService,
  EmployeeService,
  cleanupDuplicateEmployees,
  cleanupDuplicateEmployeesInTransaction,
  fixRoleUUIDs,
  // Product-related services
  TaxService,
  CategoryService,
  ProductService,
  ProductAttributeService,
  ProductAttributeValueService,
  ProductVariantService,
  InventoryService,
  StockMovementService,
  PriceHistoryService,
  // Sales services
  CustomerService,
  SaleService,
  PaymentService,
  // System services
  SyncLogService,
  SettingsService,
};