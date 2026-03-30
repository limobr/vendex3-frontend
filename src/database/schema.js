// Complete schema for shops/businesses module
export const BusinessSchema = {
  name: 'businesses',
  primaryKey: 'id',
  properties: {
    id: 'string',
    server_id: 'string?',
    name: 'string',
    registration_number: 'string?',
    phone_number: 'string?',
    email: 'string?',
    address: 'string?',
    logo_url: 'string?',
    is_active: 'bool',
    created_at: 'date',
    updated_at: 'date',
    synced_at: 'date?',
    sync_status: 'string', // 'pending', 'synced', 'error'
    is_dirty: 'bool',
  }
};

export const ShopSchema = {
  name: 'shops',
  primaryKey: 'id',
  properties: {
    id: 'string',
    server_id: 'string?',
    business_id: 'string',
    name: 'string',
    shop_type: 'string',
    location: 'string',
    phone_number: 'string?',
    email: 'string?',
    tax_rate: 'float',
    currency: 'string',
    opening_time: 'string?',
    closing_time: 'string?',
    timezone: 'string?',
    logo_url: 'string?',
    settings: 'string?', // JSON string for shop-specific settings
    is_active: 'bool',
    is_current: 'bool',
    created_at: 'date',
    updated_at: 'date',
    synced_at: 'date?',
    sync_status: 'string',
    is_dirty: 'bool',
  }
};

export const EmployeeSchema = {
  name: 'employees',
  primaryKey: 'id',
  properties: {
    id: 'string',
    server_id: 'string?',
    user_id: 'string',
    shop_id: 'string',
    business_id: 'string',
    role_type: 'string',
    role_name: 'string',
    permissions: 'string?', // JSON string for permissions array
    employment_date: 'date',
    termination_date: 'date?',
    is_active: 'bool',
    is_current: 'bool',
    created_at: 'date',
    updated_at: 'date',
    synced_at: 'date?',
    sync_status: 'string',
    is_dirty: 'bool',
  }
};

// Initialize tables in main index.js
export const initializeShopsTables = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      name TEXT NOT NULL,
      registration_number TEXT,
      phone_number TEXT,
      email TEXT,
      address TEXT,
      logo_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      is_dirty INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      shop_type TEXT DEFAULT 'retail',
      location TEXT,
      phone_number TEXT,
      email TEXT,
      tax_rate REAL DEFAULT 0.0,
      currency TEXT DEFAULT 'KES',
      opening_time TEXT,
      closing_time TEXT,
      timezone TEXT DEFAULT 'Africa/Nairobi',
      logo_url TEXT,
      settings TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      is_current INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      is_dirty INTEGER DEFAULT 0,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      user_id TEXT NOT NULL,
      shop_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      role_type TEXT DEFAULT 'attendant',
      role_name TEXT,
      permissions TEXT DEFAULT '[]',
      employment_date TEXT,
      termination_date TEXT,
      is_active INTEGER DEFAULT 1,
      is_current INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      sync_status TEXT DEFAULT 'pending',
      is_dirty INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
      UNIQUE(user_id, shop_id)
    );
  `);

  console.log('✅ Shops tables initialized');
};

// ── New tables for notifications, messages, configuration, receipt templates ──
export const initializeNewTables = async (db) => {
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

  console.log('✅ New tables (notifications, messages, configurations, receipt_templates) initialized');
};