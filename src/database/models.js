// Add to existing database models
const SyncQueueService = {
  // Create table if not exists
  createTable: async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        local_id TEXT,
        timestamp TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_queue(entity);
    `;
    
    await database.execAsync([{ sql: query, args: [] }]);
    console.log('✅ Sync queue table created');
  },

  // Add item to queue
  add: async (syncItem) => {
    const query = `
      INSERT INTO sync_queue (id, entity, action, data, local_id, timestamp, status, attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await database.runAsync(query, [
      syncItem.id,
      syncItem.entity,
      syncItem.action,
      JSON.stringify(syncItem.data),
      syncItem.localId,
      syncItem.timestamp,
      syncItem.status,
      syncItem.attempts || 0,
    ]);
    
    return syncItem.id;
  },

  // Get pending items
  getPending: async () => {
    const query = `
      SELECT * FROM sync_queue 
      WHERE status = 'pending' 
      ORDER BY timestamp ASC
      LIMIT 50
    `;
    
    const result = await database.getAllAsync(query);
    return result.map(item => ({
      ...item,
      data: JSON.parse(item.data),
    }));
  },

  // Update status
  updateStatus: async (id, status, errorMessage = null) => {
    const query = `
      UPDATE sync_queue 
      SET status = ?, error_message = ?
      WHERE id = ?
    `;
    
    await database.runAsync(query, [status, errorMessage, id]);
  },

  // Increment attempts
  incrementAttempts: async (id) => {
    const query = `
      UPDATE sync_queue 
      SET attempts = attempts + 1,
          status = CASE 
            WHEN attempts >= 2 THEN 'failed'
            ELSE 'pending'
          END
      WHERE id = ?
    `;
    
    await database.runAsync(query, [id]);
  },

  // Get counts
  getPendingCount: async () => {
    const query = `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`;
    const result = await database.getFirstAsync(query);
    return result?.count || 0;
  },

  getSyncedCount: async () => {
    const query = `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'synced'`;
    const result = await database.getFirstAsync(query);
    return result?.count || 0;
  },

  getFailedCount: async () => {
    const query = `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'`;
    const result = await database.getFirstAsync(query);
    return result?.count || 0;
  },

  // Clear all (for debugging)
  clearAll: async () => {
    await database.runAsync('DELETE FROM sync_queue');
  },
};

// Add to databaseService export
export default {
  // ... existing services
  SyncQueueService,
  SyncService: {
    ...SyncQueueService,
    // Additional sync methods
    markUserProfileForSync: async (userId, action, data) => {
      const user = await UserService.getUserById(userId);
      const syncData = {
        ...data,
        server_id: user?.server_id || null,
      };
      
      return syncManager.queueSync('user_profile', action, syncData, userId);
    },
    
    // Check if user has pending sync
    hasPendingUserSync: async (userId) => {
      const query = `
        SELECT COUNT(*) as count FROM sync_queue 
        WHERE entity = 'user_profile' 
        AND local_id = ? 
        AND status = 'pending'
      `;
      
      const result = await database.getFirstAsync(query, [userId]);
      return (result?.count || 0) > 0;
    },
  },
};