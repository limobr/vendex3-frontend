import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PermissionBadge = ({ permission, isActive, isEditable, onToggle }) => {
  const getCategoryColor = (category) => {
    const colors = {
      sales: '#2196F3',
      products: '#4CAF50',
      inventory: '#FF9800',
      customers: '#9C27B0',
      reports: '#F44336',
      employees: '#607D8B',
      settings: '#795548',
    };
    return colors[category] || '#6c757d';
  };

  const color = getCategoryColor(permission.category);

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        { 
          backgroundColor: isActive ? color + '20' : '#f8f9fa',
          borderColor: isActive ? color : '#e9ecef',
        }
      ]}
      onPress={isEditable ? onToggle : null}
      activeOpacity={isEditable ? 0.7 : 1}
    >
      <View style={styles.badgeContent}>
        {isEditable && (
          <View style={styles.checkbox}>
            <Ionicons 
              name={isActive ? 'checkbox' : 'square-outline'} 
              size={16} 
              color={isActive ? color : '#adb5bd'} 
            />
          </View>
        )}
        
        <Text style={[
          styles.badgeText,
          { color: isActive ? color : '#6c757d' }
        ]}>
          {permission.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});

export default PermissionBadge;