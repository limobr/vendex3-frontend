// src/hooks/useLocalUser.js
import { useState, useEffect, useCallback } from 'react';
import databaseService from '../database';
import { useAuth } from '../context/AuthContext';

export const useLocalUser = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from local database
  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const localUser = await databaseService.UserService.getCurrentUser();
      setUser(localUser);
      setError(null);
      return localUser;
    } catch (err) {
      console.error('Error loading local user:', err);
      setError(err.message);
      // Fallback to auth user if available
      if (authUser) {
        setUser(authUser);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  // Initial load
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Refresh user data
  const refreshUser = async () => {
    return await loadUser();
  };

  // Update user locally
  const updateLocalUser = async (updates) => {
    try {
      if (!user) {
        throw new Error('No user to update');
      }

      const updatedUser = await databaseService.UserService.updateUserLocal(user.id, updates);
      await loadUser(); // Refresh local state
      return updatedUser;
    } catch (err) {
      console.error('Error updating local user:', err);
      throw err;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!user) {
        throw new Error('No user to update');
      }

      await databaseService.UserProfileService.updateProfile(user.id, updates);
      await loadUser(); // Refresh local state
      return true;
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  };

  // Get profile by user ID - ADD THIS FUNCTION
  const getProfile = async (userId) => {
    try {
      return await databaseService.UserProfileService.getProfile(userId);
    } catch (err) {
      console.error('Error getting profile:', err);
      return null;
    }
  };

  // Get profiles pending sync
  const getPendingProfiles = async () => {
    try {
      return await databaseService.UserProfileService.getPendingSyncProfiles();
    } catch (err) {
      console.error('Error getting pending profiles:', err);
      return [];
    }
  };

  return {
    user,
    isLoading,
    error,
    updateLocalUser,
    updateUserProfile,
    getProfile, // ADD THIS
    getPendingProfiles, // ADD THIS
    refreshUser,
  };
};