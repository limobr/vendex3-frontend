// utils/SecureStorage.js
import * as SecureStore from 'expo-secure-store';

export const SecureStorage = {
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
  async getItem(key) {
    return await SecureStore.getItemAsync(key);
  },
  async deleteItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
};