import React, { createContext, useContext, useState, useEffect } from 'react';
import syncManager from '../sync/SyncManager';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
    autoSyncEnabled: true,
    wifiOnly: false,
    connectionType: 'unknown',
    syncProgress: {
      isRunning: false,
      currentStep: '',
      totalSteps: 0,
      completedSteps: 0,
      details: '',
    },
  });

  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeSync();
    
    // Update sync status every 30 seconds
    const interval = setInterval(updateSyncStatus, 30000);
    
    return () => {
      clearInterval(interval);
      syncManager.cleanup();
    };
  }, []);

  const initializeSync = async () => {
    try {
      await syncManager.initialize();
      await updateSyncStatus();
      setIsInitialized(true);
      console.log('✅ Sync Context initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sync Context:', error);
      // Set defaults even if initialization fails
      setSyncStatus(prev => ({
        ...prev,
        isOnline: false,
        isSyncing: false,
      }));
    }
  };

  const updateSyncStatus = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setSyncStatus({
        isSyncing: status.isSyncing || false,
        isOnline: status.isOnline || false,
        lastSync: status.lastSync || null,
        pendingChanges: status.pendingChanges || 0,
        autoSyncEnabled: status.autoSyncEnabled !== false,
        wifiOnly: status.wifiOnly || false,
        connectionType: status.connectionType || 'unknown',
        syncProgress: status.syncProgress || {
          isRunning: false,
          currentStep: '',
          totalSteps: 0,
          completedSteps: 0,
          details: '',
        },
      });
      setHasPendingChanges(status.pendingChanges > 0);
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  };

  const manualSync = async () => {
    if (syncStatus.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await syncManager.smartSync();
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error('Manual sync error:', error);
      return { success: false, error: error.message };
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const refreshFromServer = async () => {
    try {
      const result = await syncManager.pullDataFromServer();
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error('Refresh from server error:', error);
      return { success: false, error: error.message };
    }
  };

  const clearSyncQueue = async () => {
    try {
      // Note: syncManager doesn't have clearSyncQueue, you may need to add it
      const result = await syncManager.clearSyncQueue?.();
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error('Clear sync queue error:', error);
      return { success: false, error: error.message };
    }
  };

  const getSyncStats = async () => {
    try {
      return await syncManager.getSyncStatus();
    } catch (error) {
      console.error('Get sync stats error:', error);
      return null;
    }
  };

  const updateSyncSettings = async (settings) => {
    try {
      const result = await syncManager.updateSyncSettings(settings);
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error('Update sync settings error:', error);
      return { success: false, error: error.message };
    }
  };

  const testConnection = async () => {
    try {
      return await syncManager.testConnection?.();
    } catch (error) {
      console.error('Test connection error:', error);
      return { success: false, error: error.message };
    }
  };

  const pullAllData = async () => {
    try {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: true,
        syncProgress: {
          isRunning: true,
          currentStep: 'Starting data pull...',
          totalSteps: 5,
          completedSteps: 0,
          details: '',
        }
      }));
      
      const result = await syncManager.pullDataFromServer();
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error("Error pulling all data:", error);
      return { success: false, error: error.message };
    }
  };

  const smartSync = async () => {
    try {
      const result = await syncManager.smartSync?.();
      await updateSyncStatus();
      return result;
    } catch (error) {
      console.error("Error in smart sync:", error);
      return { success: false, error: error.message };
    }
  };

  const checkMissingData = async () => {
    try {
      return await syncManager.checkAndPullMissingData?.();
    } catch (error) {
      console.error("Error checking missing data:", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        hasPendingChanges,
        isInitialized,
        manualSync,
        refreshFromServer,
        clearSyncQueue,
        getSyncStats,
        updateSyncSettings,
        testConnection,
        pullAllData,
        smartSync,
        checkMissingData,
        updateSyncStatus,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};