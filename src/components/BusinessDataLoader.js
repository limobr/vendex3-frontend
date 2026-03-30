// src/components/BusinessDataLoader.js
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import databaseService from '../database';
import syncManager from '../sync/SyncManager';

const BusinessDataLoader = ({ children }) => {
  const { user, isOnline } = useAuth();
  const { downloadInitialBusinessData } = useBusiness();
  const [hasLoaded, setHasLoaded] = useState(false);
  const isLoadingRef = useRef(false);
  const loadAttemptedRef = useRef(false);

  // Check if business data has been loaded for this user
  const checkBusinessDataLoaded = async (userId) => {
    try {
      const hasLoadedKey = `@vendex_business_data_loaded_${userId}`;
      const alreadyLoaded = await AsyncStorage.getItem(hasLoadedKey);
      return alreadyLoaded === 'true';
    } catch (error) {
      console.error('Error checking business data loaded:', error);
      return false;
    }
  };

  // Main function to load all business-related data
  const loadAllBusinessData = async () => {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('⏳ BusinessDataLoader: Load already in progress, skipping...');
      return;
    }
    if (loadAttemptedRef.current && hasLoaded) {
      console.log('✅ BusinessDataLoader: Already loaded, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      console.log('🏢 BusinessDataLoader: Starting comprehensive business data load...');

      // Check if we've already loaded business data for this user
      const alreadyLoaded = await checkBusinessDataLoaded(user.id);
      if (alreadyLoaded) {
        console.log('✅ BusinessDataLoader: Business data already loaded');
        setHasLoaded(true);
        return;
      }

      // Step 1: Check if user already has businesses in the database
      console.log('📥 BusinessDataLoader: Checking for existing businesses...');
      const db = await databaseService.openDatabase();
      const existingBusinesses = await db.getAllAsync(
        'SELECT COUNT(*) as count FROM businesses WHERE owner_id = ? AND is_active = 1',
        [String(user.id)]
      );
      const businessCount = existingBusinesses[0]?.count || 0;
      console.log(`BusinessDataLoader: Found ${businessCount} businesses locally`);

      // If no businesses found and online, download everything
      if (businessCount === 0 && isOnline) {
        console.log('🌐 BusinessDataLoader: Online and no businesses found, downloading all data...');

        // Download business and shop data
        const businessResult = await downloadInitialBusinessData();
        if (!businessResult.success) {
          throw new Error(businessResult.error || 'Failed to download business data');
        }
        console.log(`✅ BusinessDataLoader: Downloaded ${businessResult.businessesSaved} businesses and ${businessResult.shopsSaved} shops`);

        // Download employee data (cleanup is handled inside the sync manager)
        console.log('👥 BusinessDataLoader: Now downloading employee data...');
        await downloadEmployeeData();

        // Mark as loaded
        await AsyncStorage.setItem(`@vendex_business_data_loaded_${user.id}`, 'true');

        // Show success message
        if (businessResult.businessesSaved > 0) {
          Alert.alert(
            'Data Sync Complete',
            `Successfully downloaded:\n• ${businessResult.businessesSaved} businesses\n• ${businessResult.shopsSaved} shops\n• Employee data for your team\n\nAll data is now available offline.`,
            [{ text: 'OK' }]
          );
        }
      } else if (businessCount > 0) {
        console.log(`✅ BusinessDataLoader: Found ${businessCount} businesses locally`);
        // Check and download missing data
        await checkAndDownloadMissingData();
        await AsyncStorage.setItem(`@vendex_business_data_loaded_${user.id}`, 'true');
      } else if (!isOnline) {
        console.log('📴 BusinessDataLoader: Offline mode, cannot download business data');
        Alert.alert(
          'Offline Mode',
          'You are offline. Business data will download when you go online.'
        );
      }

      setHasLoaded(true);
      loadAttemptedRef.current = true;
    } catch (error) {
      console.error('❌ BusinessDataLoader: Error loading business data:', error);
      Alert.alert(
        'Data Load Error',
        'There was an issue loading your business data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      isLoadingRef.current = false;
    }
  };

  // Function to download employee data
  const downloadEmployeeData = async () => {
    try {
      console.log('👥 BusinessDataLoader: Starting employee data download...');

      // Initialize sync manager if needed
      if (!syncManager.initialized) {
        console.log('🔄 BusinessDataLoader: Initializing sync manager...');
        await syncManager.initialize();
      }

      // Download employee assignments (cleanup is handled inside)
      const employeeResult = await syncManager.pullEmployeeAssignments();
      if (!employeeResult.success) {
        throw new Error(employeeResult.error || 'Failed to download employee data');
      }
      console.log(`✅ BusinessDataLoader: Downloaded ${employeeResult.employeesProcessed} employee assignments`);

      if (employeeResult.errors && employeeResult.errors.length > 0) {
        console.warn('⚠️ BusinessDataLoader: Some employee data had issues:', employeeResult.errors.length);
      }
    } catch (error) {
      console.error('❌ BusinessDataLoader: Error downloading employee data:', error);
      throw error;
    }
  };

  // Check for and download any missing data
  const checkAndDownloadMissingData = async () => {
    try {
      console.log('🔍 BusinessDataLoader: Checking for missing data...');
      const db = await databaseService.openDatabase();

      // Check if we have employee data
      const employeeCount = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM employees WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = ?)',
        [String(user.id)]
      );
      const hasEmployees = employeeCount?.count > 0;
      console.log(`BusinessDataLoader: Found ${employeeCount?.count || 0} employees locally`);

      // If online and missing employee data, download it
      if (isOnline && !hasEmployees) {
        console.log('👥 BusinessDataLoader: Missing employee data, downloading...');
        await downloadEmployeeData();
      }

      // Also check roles (default roles should be seeded)
      const roleCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM roles');
      console.log(`BusinessDataLoader: Found ${roleCount?.count || 0} roles locally`);
    } catch (error) {
      console.error('Error checking missing data:', error);
    }
  };

  // Reset data loaded flag (useful for testing)
  const resetDataLoadedFlag = async () => {
    try {
      if (user) {
        await AsyncStorage.removeItem(`@vendex_business_data_loaded_${user.id}`);
        console.log('🔄 BusinessDataLoader: Data loaded flag reset');
      }
    } catch (error) {
      console.error('Error resetting data loaded flag:', error);
    }
  };

  // Handle when user goes online and needs data
  useEffect(() => {
    const handleOnlineSync = async () => {
      if (isOnline && user && !hasLoaded && !isLoadingRef.current && !loadAttemptedRef.current) {
        console.log('🌐 BusinessDataLoader: Now online, checking if data needs to be loaded...');

        // Check if we have any businesses
        const db = await databaseService.openDatabase();
        const existingBusinesses = await db.getAllAsync(
          'SELECT COUNT(*) as count FROM businesses WHERE owner_id = ? AND is_active = 1',
          [String(user.id)]
        );
        const businessCount = existingBusinesses[0]?.count || 0;

        if (businessCount === 0) {
          console.log('🌐 BusinessDataLoader: No businesses found, triggering load...');
          // Small delay to ensure network is stable
          setTimeout(() => {
            loadAllBusinessData();
          }, 2000);
        }
      }
    };

    handleOnlineSync();
  }, [isOnline, user, hasLoaded]);

  // Main effect to load data when user changes
  useEffect(() => {
    if (user && !hasLoaded && !isLoadingRef.current && !loadAttemptedRef.current) {
      console.log('🔄 BusinessDataLoader: User detected, starting load...');
      // Give the app time to initialize (wait for auth to fully settle)
      const timer = setTimeout(() => {
        loadAllBusinessData();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, hasLoaded]);

  // Expose reset function for debugging
  useEffect(() => {
    if (__DEV__) {
      window.resetBusinessData = () => {
        console.log('🔄 Manual reset triggered');
        resetDataLoadedFlag();
        setHasLoaded(false);
        loadAttemptedRef.current = false;
      };
    }
  }, []);

  // Optional: Show loading indicator if needed
  if (isLoadingRef.current) {
    console.log('⏳ BusinessDataLoader: Currently loading business data...');
  }

  return children;
};

export default BusinessDataLoader;