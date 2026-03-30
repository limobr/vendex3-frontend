import { BaseService } from './BaseService';

class EmployeeService extends BaseService {
  constructor() {
    super();
  }

  // Get employees by shop ID
  async getEmployeesByShop(shopId) {
    try {
      const db = await this.getDatabase();
      const employees = await db.getAllAsync(
        `SELECT e.*, u.username, u.first_name, u.last_name 
         FROM employees e
         LEFT JOIN users u ON e.user_id = u.id
         WHERE e.shop_id = ? AND e.is_active = 1`,
        [shopId]
      );
      return employees;
    } catch (error) {
      console.error('❌ Error getting employees:', error);
      return [];
    }
  }

  // Add employee to shop
  async addEmployee(employeeData) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();
      const employeeId = this.generateId();

      // Validate required fields
      const errors = this.validateRequired(employeeData, ['user_id', 'shop_id', 'role_type']);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      await db.runAsync(
        `INSERT INTO employees (
          id, user_id, shop_id, business_id, role_type, role_name, permissions,
          employment_date, is_active, created_at, updated_at, sync_status, is_dirty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          employeeData.user_id,
          employeeData.shop_id,
          employeeData.business_id,
          employeeData.role_type,
          employeeData.role_name || '',
          employeeData.permissions ? JSON.stringify(employeeData.permissions) : '[]',
          employeeData.employment_date || now,
          1,
          now,
          now,
          'pending',
          1
        ]
      );

      console.log('✅ Employee added:', employeeId);
      return { success: true, id: employeeId };
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      return { success: false, error: error.message };
    }
  }

  // Update employee
  async updateEmployee(employeeId, updates) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      const allowedFields = ['role_type', 'role_name', 'permissions', 'is_active'];
      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          updateFields.push(`${field} = ?`);
          if (field === 'permissions') {
            updateValues.push(JSON.stringify(updates[field]));
          } else {
            updateValues.push(updates[field]);
          }
        }
      });

      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      updateValues.push(now, employeeId);

      const query = `
        UPDATE employees 
        SET ${updateFields.join(', ')}, updated_at = ?, sync_status = 'pending', is_dirty = 1
        WHERE id = ?
      `;

      await db.runAsync(query, updateValues);

      console.log('✅ Employee updated:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove employee (soft delete)
  async removeEmployee(employeeId) {
    try {
      const db = await this.getDatabase();
      const now = this.getCurrentTimestamp();

      await db.runAsync(
        `UPDATE employees SET is_active = 0, updated_at = ?, sync_status = 'pending', is_dirty = 1 WHERE id = ?`,
        [now, employeeId]
      );

      console.log('✅ Employee removed:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing employee:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmployeeService();