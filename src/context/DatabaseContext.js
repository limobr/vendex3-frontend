// src/context/DatabaseContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import databaseService from '../database';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Initializing local database...');
      
      // First initialize, then migrate
      const initSuccess = await databaseService.initDatabase();
      
      if (initSuccess) {
        // Run any additional setup
        const db = await databaseService.openDatabase();
        
        // Verify tables exist
        const tables = await db.getAllAsync(
          "SELECT name FROM sqlite_master WHERE type='table'"
        );
        console.log('📊 Database tables:', tables.map(t => t.name));
        
        setIsInitialized(true);
        console.log('✅ Database context ready');
      } else {
        throw new Error('Failed to initialize database');
      }
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // User operations
  const saveUser = async (userData) => {
    try {
      return await databaseService.UserService.saveUser(userData);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  const getCurrentUser = async () => {
    try {
      return await databaseService.UserService.getCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  const updateUserLocal = async (userId, updates) => {
    try {
      return await databaseService.UserService.updateUserLocal(userId, updates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const setCurrentUser = async (userId) => {
    try {
      return await databaseService.UserService.setCurrentUser(userId);
    } catch (error) {
      console.error('Error setting current user:', error);
      return false;
    }
  };

  // User Profile operations
  const saveProfile = async (userId, profileData) => {
    try {
      return await databaseService.UserProfileService.saveProfile(userId, profileData);
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    }
  };

  const updateProfile = async (userId, updates) => {
    try {
      return await databaseService.UserProfileService.updateProfile(userId, updates);
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const getProfile = async (userId) => {
    try {
      return await databaseService.UserProfileService.getProfile(userId);
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  };

  // Shop operations
  const saveShop = async (shopData) => {
    try {
      return await databaseService.ShopService.saveShop(shopData);
    } catch (error) {
      console.error('Error saving shop:', error);
      throw error;
    }
  };

  const setCurrentShop = async (shopId) => {
    try {
      return await databaseService.ShopService.setCurrentShop(shopId);
    } catch (error) {
      console.error('Error setting current shop:', error);
      return false;
    }
  };

  const getCurrentShop = async () => {
    try {
      return await databaseService.ShopService.getCurrentShop();
    } catch (error) {
      console.error('Error getting current shop:', error);
      return null;
    }
  };

  const getUserShops = async () => {
    try {
      return await databaseService.ShopService.getUserShops();
    } catch (error) {
      console.error('Error getting user shops:', error);
      return [];
    }
  };

  // Employee operations
  const saveEmployee = async (employeeData) => {
    try {
      return await databaseService.EmployeeService.saveEmployee(employeeData);
    } catch (error) {
      console.error('Error saving employee:', error);
      throw error;
    }
  };

  const getCurrentEmployeeContext = async () => {
    try {
      return await databaseService.EmployeeService.getCurrentEmployeeContext();
    } catch (error) {
      console.error('Error getting employee context:', error);
      return null;
    }
  };

  // Settings operations
  const setSetting = async (userId, key, value) => {
    try {
      return await databaseService.SettingsService.setSetting(userId, key, value);
    } catch (error) {
      console.error('Error setting app setting:', error);
      return false;
    }
  };

  const getSetting = async (userId, key) => {
    try {
      return await databaseService.SettingsService.getSetting(userId, key);
    } catch (error) {
      console.error('Error getting app setting:', error);
      return null;
    }
  };

  const getUserSettings = async (userId) => {
    try {
      return await databaseService.SettingsService.getUserSettings(userId);
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        // State
        isInitialized,
        isLoading,
        error,
        
        // User operations
        saveUser,
        getCurrentUser,
        updateUserLocal,
        setCurrentUser,
        
        // Profile operations
        saveProfile,
        updateProfile,
        getProfile,
        
        // Shop operations
        saveShop,
        setCurrentShop,
        getCurrentShop,
        getUserShops,
        
        // Employee operations
        saveEmployee,
        getCurrentEmployeeContext,
        
        // Settings operations
        setSetting,
        getSetting,
        getUserSettings,
        
        // Direct service access (for advanced usage)
        services: databaseService,
        
        // Reinitialize if needed
        reinitialize: initializeDatabase,
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