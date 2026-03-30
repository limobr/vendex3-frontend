import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import databaseService from '../index';

export class BaseService {
  constructor() {
    this.db = null;
  }

  async getDatabase() {
    if (!this.db) {
      this.db = await databaseService.openDatabase();
    }
    return this.db;
  }

  async getCurrentUser() {
    return await databaseService.UserService.getCurrentUser();
  }

  async getCurrentUserId() {
    const user = await this.getCurrentUser();
    return user?.id || null;
  }

  // Helper to ensure string ID
  ensureStringId(id) {
    if (id === null || id === undefined) return null;
    return String(id);
  }

  // Convert object to JSON string for storage
  stringifyIfNeeded(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  // Parse JSON string back to object
  parseIfNeeded(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  // Get current timestamp
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Mark entity as dirty for sync
  async markAsDirty(table, id, field = 'is_dirty') {
    const db = await this.getDatabase();
    await db.runAsync(
      `UPDATE ${table} SET ${field} = 1, sync_status = 'pending', updated_at = ? WHERE id = ?`,
      [this.getCurrentTimestamp(), id]
    );
    return true;
  }

  // Mark entity as synced
  async markAsSynced(table, localId, serverId) {
    const db = await this.getDatabase();
    await db.runAsync(
      `UPDATE ${table} SET server_id = ?, synced_at = ?, is_dirty = 0, sync_status = 'synced' WHERE id = ?`,
      [serverId, this.getCurrentTimestamp(), localId]
    );
    return true;
  }

  // Get pending sync entities
  async getPendingSync(table) {
    const db = await this.getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM ${table} WHERE is_dirty = 1 OR sync_status = 'pending'`
    );
  }

  // Generate unique ID
  generateId() {
    return nanoid();
  }

  // Validate required fields
  validateRequired(data, requiredFields) {
    const errors = [];
    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    return errors;
  }
}

export default new BaseService();