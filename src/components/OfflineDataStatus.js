// src/components/OfflineDataStatus.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBusiness } from '../context/BusinessContext';
import { useShop } from '../context/ShopContext';

export default function OfflineDataStatus() {
  const { businesses, pendingSyncCount, isOnline } = useBusiness();
  const { shops } = useShop();

  if (!isOnline && businesses.length > 0) {
    return (
      <View style={styles.offlineContainer}>
        <Ionicons name="cloud-offline-outline" size={20} color="#FF6B00" />
        <Text style={styles.offlineText}>
          Offline Mode • {businesses.length} businesses, {shops.length} shops available
        </Text>
      </View>
    );
  }

  if (pendingSyncCount > 0 && isOnline) {
    return (
      <TouchableOpacity style={styles.syncContainer}>
        <Ionicons name="cloud-upload-outline" size={20} color="#FF6B00" />
        <Text style={styles.syncText}>
          {pendingSyncCount} item(s) pending sync
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F0',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  offlineText: {
    color: '#FF6B00',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F0',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  syncText: {
    color: '#FF6B00',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});