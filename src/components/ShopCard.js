import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SHOP_TYPE_ICONS = {
  retail: 'cart-outline',
  wholesale: 'cube-outline',
  supermarket: 'basket-outline',
  restaurant: 'restaurant-outline',
  kiosk: 'storefront-outline',
  pharmacy: 'medical-outline',
  other: 'business-outline',
};

const ShopCard = ({ shop, onPress, onDelete, showStats = true }) => {
  const shopIcon = SHOP_TYPE_ICONS[shop.shop_type] || 'business-outline';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={shopIcon} size={24} color="#2196F3" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
          <Text style={styles.type}>
            {shop.shop_type.charAt(0).toUpperCase() + shop.shop_type.slice(1)}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color="#dc3545" />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color="#6c757d" />
          <Text style={styles.detailText} numberOfLines={1}>{shop.location}</Text>
        </View>
        
        {shop.phone_number && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color="#6c757d" />
            <Text style={styles.detailText}>{shop.phone_number}</Text>
          </View>
        )}
      </View>
      
      {showStats && (
        <View style={styles.stats}>
          <View style={styles.statBadge}>
            <Ionicons name="people-outline" size={12} color="#6c757d" />
            <Text style={styles.statBadgeText}>
              {shop.employee_count || 0} Employees
            </Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="cash-outline" size={12} color="#6c757d" />
            <Text style={styles.statBadgeText}>{shop.currency} {shop.tax_rate}% VAT</Text>
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
    backgroundColor: '#E3F2FD',
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
  type: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statBadgeText: {
    fontSize: 11,
    color: '#6c757d',
    marginLeft: 4,
  },
});

export default ShopCard;