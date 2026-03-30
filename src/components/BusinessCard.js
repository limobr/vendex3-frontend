import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BusinessCard = ({ business, onPress, showStats = true }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={24} color="#FF6B00" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>{business.name}</Text>
          {business.registration_number && (
            <Text style={styles.regNumber}>{business.registration_number}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
      </View>
      
      {showStats && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="storefront-outline" size={16} color="#6c757d" />
            <Text style={styles.statText}>{business.shop_count || 0} Shops</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#6c757d" />
            <Text style={styles.statText}>
              {new Date(business.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF7F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  regNumber: {
    fontSize: 12,
    color: '#6c757d',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
});

export default BusinessCard;