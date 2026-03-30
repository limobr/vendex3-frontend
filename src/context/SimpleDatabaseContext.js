// src/context/SimpleDatabaseContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import databaseService, { initDatabase } from '../database/simpleDatabase';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await initDatabase();
      setIsInitialized(true);
      console.log('✅ Database context initialized');
      
      // Load current user from database
      const user = await databaseService.UserService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('❌ Database context init error:', error);
    }
  };

  // User operations
  const saveUser = async (userData) => {
    const result = await databaseService.UserService.saveUser(userData);
    if (result && result.id) {
      // Update current user state
      const user = await databaseService.UserService.getCurrentUser();
      setCurrentUser(user);
    }
    return result;
  };

  const getCurrentUser = async () => {
    if (currentUser) return currentUser;
    return await databaseService.UserService.getCurrentUser();
  };

  const updateUserProfile = async (updates) => {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const result = await databaseService.UserService.updateUserLocal(user.id, updates);
    if (result) {
      const updatedUser = await databaseService.UserService.getCurrentUser();
      setCurrentUser(updatedUser);
    }
    return result;
  };

  // Sale operations - accepts userId as parameter
  const createSale = async (saleData) => {
    return await databaseService.SaleService.createSale(saleData);
  };

  const getPendingSales = async () => {
    return await databaseService.SaleService.getPendingSales();
  };

  const getUserSales = async (userId, limit = 50) => {
    if (!userId) return [];
    return await databaseService.SaleService.getUserSales(userId, limit);
  };

  // Customer operations
  const saveCustomer = async (customerData) => {
    return await databaseService.CustomerService.saveCustomer(customerData);
  };

  const searchCustomers = async (searchTerm) => {
    return await databaseService.CustomerService.searchCustomers(searchTerm);
  };

  const getAllCustomers = async () => {
    return await databaseService.CustomerService.getAllCustomers();
  };

  // Sync operations
  const getSyncQueue = async () => {
    return await databaseService.SyncQueueService.getPendingSyncItems();
  };

  const clearLocalData = async () => {
    // This would require clearing all tables
    console.log('Clear local data function called');
    setCurrentUser(null);
  };

  return (
    <DatabaseContext.Provider
      value={{
        isInitialized,
        currentUser,
        
        // User operations
        saveUser,
        getCurrentUser,
        updateUserProfile,
        
        // Sale operations
        createSale,
        getPendingSales,
        getUserSales,
        
        // Customer operations
        saveCustomer,
        searchCustomers,
        getAllCustomers,
        
        // Sync operations
        getSyncQueue,
        clearLocalData,
        
        // Raw services for advanced usage
        services: databaseService,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};